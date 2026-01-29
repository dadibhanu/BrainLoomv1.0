import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],

    // DEV MODE (vite dev)
    server: {
      port: 5173,
      host: '0.0.0.0',
    },

    // PREVIEW MODE (vite preview)  ✅ THIS FIXES YOUR ISSUE
    preview: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: [
        'brainloom.in',
        'www.brainloom.in'
      ]
    },

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
