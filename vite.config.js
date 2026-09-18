import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // during local dev, run `vercel dev` instead so /api works.
      // this proxy is a fallback if you run a separate node server on 5000.
      '/api': 'http://localhost:5000'
    }
  }
});
