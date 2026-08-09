import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useI18n } from '../../i18n'

interface Props {
  children: ReactNode
  tt?: (value: string) => string
}
interface State {
  error: Error | null
}

/** Catches render-time crashes so the user sees a recoverable message, not a blank window. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[rtslytics] render error:', error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background p-8 text-center text-foreground">
          <h1 className="text-lg font-semibold">{this.props.tt?.('Something went wrong') ?? 'Something went wrong'}</h1>
          <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {this.props.tt?.('Try again') ?? 'Try again'}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/** Adds locale-aware copy while keeping the crash-catching class component. */
export function LocalizedErrorBoundary({ children }: { children: ReactNode }) {
  const { tt } = useI18n()
  return <ErrorBoundary tt={tt}>{children}</ErrorBoundary>
}
