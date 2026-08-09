import { NavLink } from 'react-router-dom'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'
import { navItems, navWorkspaces, type WorkspaceId } from '../nav'

/**
 * Local navigation for a workspace. It keeps related tools one click apart
 * without forcing every screen to compete for permanent space in the top bar.
 */
export function WorkspaceNav({ workspace }: { workspace: WorkspaceId }) {
  const { tt } = useI18n()
  const definition = navWorkspaces.find((item) => item.id === workspace)
  const tabs = navItems.filter((item) => item.workspace === workspace)

  if (!definition || tabs.length < 2) return null

  return (
    <nav
      aria-label={tt('Workspace navigation')}
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-border pb-px"
    >
      {tabs.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              cn(
                '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 font-display text-[11px] font-semibold tracking-[0.08em] transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {tt(item.label)}
          </NavLink>
        )
      })}
    </nav>
  )
}
