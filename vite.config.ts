import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react()],

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true
    },

    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['brainloom.space', 'www.brainloom.space']
    },

    // ✅ Vite-safe env usage
    define: {
      __GEMINI_API_KEY__: JSON.stringify(env.VITE_GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  }
})
