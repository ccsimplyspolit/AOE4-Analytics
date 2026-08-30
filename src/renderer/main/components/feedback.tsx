import { Loader2, AlertTriangle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'

export function AutoBusy({ label }: { label: string }) {
  const { tt } = useI18n()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      {tt(label)}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  const { tt } = useI18n()
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
      {label ?? tt('Loading…')}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { tt } = useI18n()
  return (
    <div className="rts-menu-card rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="rts-section-title text-destructive">{tt('Something went wrong')}</span>
      </div>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rts-btn mt-2 text-xs text-primary">
          {tt('Retry')}
        </button>
      )}
    </div>
  )
}

export function EmptyBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-card/40 py-10 text-center text-sm text-muted-foreground">
      <Inbox className="h-5 w-5 opacity-50" />
      {children}
    </div>
  )
}
