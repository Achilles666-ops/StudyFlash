import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'create-assetsignore',
      closeBundle() {
        writeFileSync(
          'dist/.assetsignore',
          '_worker.js\n'
        )
        console.log('Created dist/.assetsignore')
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth',
                     'firebase/firestore']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
