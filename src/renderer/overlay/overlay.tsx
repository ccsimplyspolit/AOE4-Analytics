import React from 'react'
import ReactDOM from 'react-dom/client'
import { OverlayApp } from './OverlayApp'
import { LocalizedErrorBoundary } from '@shared/components/ErrorBoundary'
import { I18nProvider } from '../i18n'
import '@shared/styles/globals.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <I18nProvider>
      <LocalizedErrorBoundary>
        <OverlayApp />
      </LocalizedErrorBoundary>
    </I18nProvider>
  </React.StrictMode>,
)
