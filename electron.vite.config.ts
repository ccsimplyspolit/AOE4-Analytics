import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const alias = {
  '@': resolve('src/renderer'),
  '@shared': resolve('src/renderer/shared'),
  '@domain': resolve('src/domain'),
  '@api': resolve('src/api'),
  '@data': resolve('src/data'),
  '@store': resolve('src/store'),
  '@ipc': resolve('electron/ipc'),
}

const rendererManualChunks = (id: string): string | undefined => {
  const normalizedId = id.replaceAll('\\', '/')

  if (normalizedId.includes('/node_modules/')) {
    if (normalizedId.includes('/recharts/') || normalizedId.includes('/d3-')) return 'charts'
    if (normalizedId.includes('/lucide-react/')) return 'icons'
    if (
      normalizedId.includes('/react/') ||
      normalizedId.includes('/react-dom/') ||
      normalizedId.includes('/scheduler/') ||
      normalizedId.includes('/react-router') ||
      normalizedId.includes('/@tanstack/')
    ) {
      return 'framework'
    }
    return 'vendor'
  }

  if (normalizedId.endsWith('/src/data/buildOrderArchive.json')) return 'build-order-archive'
  if (normalizedId.endsWith('/data/research/essence/rgd-projection.json')) return 'essence-projection'
  if (normalizedId.endsWith('/src/data/vendor/aoe4-icons/manifest.ts')) return 'icon-manifest'
  if (normalizedId.endsWith('/src/data/tinctureHistory.json')) return 'tincture-history'

  return undefined
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      minify: 'esbuild',
      rollupOptions: { input: { index: resolve('electron/main.ts') } },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      minify: 'esbuild',
      rollupOptions: { input: { index: resolve('electron/preload.ts') } },
    },
  },
  renderer: {
    root: '.',
    resolve: { alias },
    plugins: [react()],
    build: {
      minify: 'esbuild',
      // Large generated data catalogs are loaded as dedicated lazy chunks.
      // Keep the warning useful for application code while allowing the archive
      // itself to exceed the default 500 kB threshold.
      chunkSizeWarningLimit: 3072,
      rollupOptions: {
        input: {
          index: resolve('index.html'),
          overlay: resolve('overlay.html'),
        },
        output: {
          manualChunks: rendererManualChunks,
        },
      },
    },
  },
})
