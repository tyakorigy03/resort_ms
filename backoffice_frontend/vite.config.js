import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        // target: 'https://api.chumbaplus.com',
        target: 'http://localhost:5000',


        changeOrigin: true,
      },
      '/uploads': {
        // target: 'https://api.chumbaplus.com',
        target: 'http://localhost:5000',


        changeOrigin: true,
      },
    },
  },
})
