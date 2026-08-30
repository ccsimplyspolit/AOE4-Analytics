import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'
import { useSectionFold } from '../hooks/useSectionFold'

/** Overview card whose open/closed state is remembered in localStorage. */
export function FoldableCard({
  id,
  icon: Icon,
  title,
  trailing,
  children,
}: {
  id: string
  icon?: LucideIcon
  title: string
  trailing?: ReactNode
  children: ReactNode
}) {
  const { tt } = useI18n()
  const { collapsed, toggle } = useSectionFold(id)
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls={`${id}-body`}
            aria-label={`${collapsed ? tt('Expand section') : tt('Collapse section')}: ${title}`}
            className="flex min-w-0 items-center gap-1.5 text-left text-sm font-semibold hover:text-primary"
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" /> : null}
            <span className="truncate">{title}</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                collapsed && '-rotate-90',
              )}
            />
          </button>
          {collapsed ? null : trailing}
        </div>
        {collapsed ? null : (
          <div id={`${id}-body`} className="space-y-3">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
