import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // Web host (Netlify/Vercel) için '/' kullan, Capacitor (mobil) için './' kullan.
  const isWebHost = process.env.NETLIFY === 'true' || process.env.VERCEL === '1';

  return {
    base: isWebHost ? '/' : './',
    plugins: [react()],
    server: {
      port: 5173,
      open: true
    }
  };
})
