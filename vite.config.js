import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/uploads': 'http://localhost:8080',
    },
  },
  build: {
    // The production build is served directly by Spring Boot as static content.
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
});
