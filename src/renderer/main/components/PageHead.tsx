import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'

/**
 * Chapter-style page header: a small-caps gold kicker, the title in the incised
 * serif, and an engraved rule with a diamond — the app's shared page voice.
 */
export function PageHead({
  kicker,
  title,
  sub,
  aside,
}: {
  /** Tiny small-caps line above the title, e.g. "War room". */
  kicker: string
  title: string
  /** One-line description under the title. */
  sub?: string
  /** Optional right-aligned content (buttons, filters). */
  aside?: ReactNode
}) {
  const { tt } = useI18n()
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/70">
            {tt(kicker)}
          </div>
          <h1 className="mt-0.5 text-[26px] leading-tight tracking-tight">{tt(title)}</h1>
          {sub && <p className="mt-0.5 text-sm text-muted-foreground">{tt(sub)}</p>}
        </div>
        {aside && <div className="shrink-0 pb-1">{aside}</div>}
      </div>
      {/* Engraved rule: diamond anchor, hairline fading out to the right. */}
      <div className="flex items-center gap-2" aria-hidden>
        <span className="h-1.5 w-1.5 rotate-45 bg-primary/70" />
        <span className="h-px flex-1 bg-gradient-to-r from-primary/40 via-border to-transparent" />
      </div>
    </header>
  )
}
