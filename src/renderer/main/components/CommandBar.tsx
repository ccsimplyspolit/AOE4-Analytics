import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Copy, Info, Landmark, Minus, Settings as SettingsIcon, Square, X } from 'lucide-react'
import { ipc } from '@shared/ipc'
import { cn } from '@shared/lib/utils'
import { navWorkspaces, workspaceForPath } from '../nav'
import { useSettings } from '../queries/useProfile'
import { AccountSwitcher } from './AccountSwitcher'
import { LOCALE_OPTIONS, useI18n } from '../../i18n'

/**
 * The app's single top bar — launcher style. One row carries the brand (once),
 * the nav ribbon, the account chip, and the window controls; it is also the
 * frameless window's drag handle. Replaces the old sidebar + title bar.
 */
export function CommandBar() {
  const { data: settings } = useSettings()
  const { locale, setLocale, tt } = useI18n()
  const hasProfile = settings?.profileId != null
  const [maximized, setMaximized] = useState(false)
  const location = useLocation()

  useEffect(() => {
    ipc
      .isWindowMaximized()
      .then(setMaximized)
      .catch(() => {})
    return ipc.onWindowMaximizedChanged(setMaximized)
  }, [])

  const activeWorkspace = workspaceForPath(location.pathname)

  return (
    <header className="drag-region relative z-40 flex h-12 shrink-0 select-none items-stretch overflow-hidden border-b border-border bg-card/95">
      {/* Brand — the only place the name appears. */}
      <div className="flex shrink-0 items-center gap-2.5 border-r border-border/70 pl-4 pr-5">
        <Landmark className="h-4 w-4 text-primary" />
        <span className="whitespace-nowrap font-display text-[13px] font-bold tracking-[0.18em] text-foreground">
          RTSLytics
        </span>
      </div>

      {/* Workspace ribbon: stable top-level destinations only. */}
      {hasProfile && (
        <div className="no-drag flex min-w-0 flex-1 items-center justify-center overflow-x-auto overflow-y-hidden px-4 [scrollbar-width:thin]">
          <nav
            aria-label={tt('Main navigation')}
            className="flex h-8 min-w-max items-center gap-0.5 rounded-md border border-border/80 bg-background/45 p-0.5 shadow-sm"
          >
            {navWorkspaces.map((workspace) => (
              <NavLink
                key={workspace.id}
                to={workspace.defaultPath}
                aria-current={activeWorkspace === workspace.id ? 'page' : undefined}
                className={cn(
                  'flex h-7 shrink-0 items-center rounded-sm px-3 font-display text-[11px] font-semibold tracking-[0.07em] transition-all',
                  activeWorkspace === workspace.id
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/35'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                )}
              >
                {tt(workspace.label)}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Drag gutter */}
      {!hasProfile && <div className="min-w-6 flex-1" />}

      {/* Right cluster: settings/about, account, window controls */}
      <div className="no-drag flex shrink-0 items-center gap-1 pr-1">
        <label className="mr-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="sr-only">{tt('Language')}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as typeof locale)}
            aria-label={tt('Language')}
            className="h-7 rounded border border-border bg-background px-1.5 text-[11px] text-foreground"
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

function IconNav({ to, title, children }: { to: string; title: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      title={title}
      className={({ isActive }) =>
        cn(
          'flex h-8 w-8 items-center justify-center rounded-sm transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
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
