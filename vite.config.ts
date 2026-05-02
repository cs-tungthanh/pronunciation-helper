import { defineConfig, Plugin } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

function copyExtensionFiles(): Plugin {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      // Copy manifest.json
      copyFileSync('manifest.json', 'dist/manifest.json')

      // Copy CSS
      copyFileSync('src/content/popup.css', 'dist/popup.css')

      // Create icons directory
      mkdirSync('dist/icons', { recursive: true })

      // Copy all icons
      const iconSizes = ['16', '48', '128']
      iconSizes.forEach(size => {
        try {
          copyFileSync(`src/icons/icon${size}.png`, `dist/icons/icon${size}.png`)
        } catch {
          console.log(`Note: No icon found at src/icons/icon${size}.png`)
        }
      })
    }
  }
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [copyExtensionFiles()],
})
