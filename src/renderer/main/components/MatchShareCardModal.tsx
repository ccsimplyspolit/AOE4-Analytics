import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Share2, X } from 'lucide-react'
import { drawShareCard, type ShareCardInput } from '@domain/matchShareCard'
import { cn } from '@shared/lib/utils'
import { useI18n } from '../../i18n'

/**
 * Creates an in-memory canvas, draws the card, and returns the resulting Blob.
 */
async function renderShareCardToBlob(input: ShareCardInput): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 675
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  drawShareCard(ctx, input, 1200, 675)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95)
  })
}

/**
 * Downloads the card as a local PNG file.
 */
async function downloadShareCard(input: ShareCardInput, filename = 'rtslytics-match-recap.png'): Promise<void> {
  const blob = await renderShareCardToBlob(input)
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Copies the card PNG image directly to the system clipboard.
 */
async function copyShareCardToClipboard(input: ShareCardInput): Promise<boolean> {
  try {
    const blob = await renderShareCardToBlob(input)
    if (!blob || !navigator.clipboard?.write) return false
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ])
    return true
  } catch {
    return false
  }
}

export function MatchShareCardModal({
  open,
  onClose,
  input,
}: {
  open: boolean
  onClose: () => void
  input: ShareCardInput
}) {
  const { tt } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!open || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (ctx) {
      drawShareCard(ctx, input, 1200, 675)
    }
  }, [open, input])

  if (!open) return null

  const handleCopy = async () => {
    const success = await copyShareCardToClipboard(input)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const filename = `aoe4-match-${input.matchId}-${input.myCiv || 'civ'}.png`
      await downloadShareCard(input, filename)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border/70 bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{tt('Match Recap & Share Card')}</h2>
              <p className="text-xs text-muted-foreground">
                {tt('High-resolution summary infographic for Discord, Reddit, and social sharing.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body / Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-background/50">
          <div className="w-full max-w-3xl aspect-[16/9] rounded-lg border border-border/60 shadow-lg overflow-hidden bg-black/40 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={1200}
              height={675}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            {tt('1200×675 High-DPI canvas preview · Includes economy, TC uptime, and coach findings.')}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-6 py-4 bg-card/80">
          <span className="text-xs text-muted-foreground">
            {tt('Match')} #{input.matchId}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all shadow-sm',
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border/50',
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? tt('Copied to Clipboard!') : tt('Copy Image')}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-sm"
            >
              <Download className="h-4 w-4" />
              {downloading ? tt('Saving…') : tt('Download PNG')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
