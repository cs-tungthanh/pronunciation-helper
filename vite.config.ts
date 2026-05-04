import { defineConfig, Plugin } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

function copyExtensionFiles(): Plugin {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      // Copy manifest.json
      copyFileSync('manifest.json', 'dist/manifest.json')

      // Copy CSS files
      copyFileSync('src/content/popup.css', 'dist/content-popup.css')
      copyFileSync('src/options/options.css', 'dist/options.css')
      copyFileSync('src/popup/popup.css', 'dist/popup.css')

      // Copy HTML files
      copyFileSync('src/options/options.html', 'dist/options.html')
      copyFileSync('src/popup/popup.html', 'dist/popup.html')

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
        options: resolve(__dirname, 'src/options/options.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [copyExtensionFiles()],
})
