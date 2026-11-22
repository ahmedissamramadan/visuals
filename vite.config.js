import { defineConfig } from 'vite';

export default defineConfig({
  base: '/visuals/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 3000
  }
});
