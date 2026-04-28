import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // Eğer Netlify üzerinde derleniyorsa (NETLIFY environment variable varsa) '/' kullan,
  // Aksi halde (Capacitor, mobil uygulama için) './' kullanmaya devam et.
  const isNetlify = process.env.NETLIFY === 'true';

  return {
    base: isNetlify ? '/' : './',
    plugins: [react()],
    server: {
      port: 5173,
      open: true
    }
  };
})
