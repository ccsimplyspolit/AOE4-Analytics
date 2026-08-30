import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'

export interface ScreenTabItem<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
  /** When false, `label` is shown as-is (already composed or translated). */
  translate?: boolean
}

export interface ScreenTabGroup<T extends string> {
  id: string
  label: string
  tabIds: readonly T[]
}

/** Shared underline tab strip used by every chapter screen. */
export function ScreenTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  trailing,
  size = 'md',
}: {
  items: readonly ScreenTabItem<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel?: string
  trailing?: ReactNode
  size?: 'md' | 'sm'
}) {
  const { tt } = useI18n()
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex flex-wrap gap-0.5 rounded-sm border border-border/80 bg-secondary/25 p-0.5"
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const Icon = item.icon
          const active = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-sm border-b-0 transition-colors',
                size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm',
                active
                  ? 'bg-background text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]'
                  : 'text-muted-foreground hover:bg-background/40 hover:text-foreground',
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {item.translate === false ? item.label : tt(item.label)}
            </button>
          )
        })}
      </div>
      {trailing ? <div className="flex flex-wrap gap-2">{trailing}</div> : null}
    </div>
  )
}

/** Two-level tabs: a family row, then the tabs that belong to it. */
export function GroupedScreenTabs<T extends string>({
  groups,
  items,
  value,
  onChange,
  groupAriaLabel,
  tabAriaLabel,
  trailing,
}: {
  groups: readonly ScreenTabGroup<T>[]
  items: readonly ScreenTabItem<T>[]
  value: T
  onChange: (id: T) => void
  groupAriaLabel?: string
  tabAriaLabel?: string
  trailing?: ReactNode
}) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const activeGroup = groups.find((group) => group.tabIds.includes(value)) ?? groups[0]
  if (!activeGroup) return null
  const childItems = activeGroup.tabIds
    .map((id) => byId.get(id))
    .filter((item): item is ScreenTabItem<T> => item != null)

  return (
    <div className="space-y-2">
      <ScreenTabs
        items={groups.map((group) => ({ id: group.id, label: group.label }))}
        value={activeGroup.id}
        onChange={(groupId) => {
          const group = groups.find((entry) => entry.id === groupId)
          if (!group) return
          if (group.tabIds.includes(value)) return
          const first = group.tabIds[0]
          if (first) onChange(first)
        }}
        ariaLabel={groupAriaLabel}
      />
      {childItems.length > 1 ? (
        <ScreenTabs
          items={childItems}
          value={value}
          onChange={onChange}
          ariaLabel={tabAriaLabel}
          trailing={trailing}
          size="sm"
        />
      ) : trailing ? (
        <div className="flex justify-end">{trailing}</div>
      ) : null}
    </div>
  )
}
