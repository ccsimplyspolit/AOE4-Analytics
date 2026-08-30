import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'

/**
 * Chapter-style page header: a small-caps kicker, the title in the incised
 * serif, and an engraved rule with a diamond — the app's shared page voice.
 */
export function PageHead({
  kicker,
  title,
  sub,
  aside,
  raw,
  embedded,
}: {
  kicker: string
  title: string
  sub?: string
  aside?: ReactNode
  raw?: boolean
  /** Nested in another screen's tab strip — keep actions, drop the chapter header. */
  embedded?: boolean
}) {
  const { tt } = useI18n()
  if (embedded) {
    return aside ? <div className="flex justify-end">{aside}</div> : null
  }
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {tt(kicker)}
          </div>
          <h1 className="mt-0.5 text-[22px] leading-tight tracking-[0.03em]">
            {raw ? title : tt(title)}
          </h1>
          {sub && (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {raw ? sub : tt(sub)}
            </p>
          )}
        </div>
        {aside && <div className="shrink-0 pb-0.5">{aside}</div>}
      </div>
      <div className="flex items-center gap-2" aria-hidden>
        <span className="h-1.5 w-1.5 rotate-45 bg-primary/70" />
        <span className="h-px flex-1 bg-gradient-to-r from-primary/40 via-border to-transparent" />
      </div>
    </header>
  )
}
