import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // tracker klasörünü dist'e kopyala (portfolio tracker dokunulmaz)
    viteStaticCopy({
      targets: [
        { src: 'tracker', dest: '' },
        { src: 'tez', dest: '' }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
