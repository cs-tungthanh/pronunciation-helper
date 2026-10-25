import { defineConfig } from 'vite'
import { resolve } from 'path'

// Content scripts run as classic scripts, so bundle into one self-contained IIFE.
// Runs after vite.config.ts, which empties dist.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      name: 'PronunciationHelperContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
})
