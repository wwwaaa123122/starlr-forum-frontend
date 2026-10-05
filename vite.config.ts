import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      // 开发时代理到本地 Worker（前后端分离开发，部署时由同一 Worker 承载）
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/oauth': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/.well-known': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  build: {
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'rehype-sanitize', 'rehype-highlight'],
        },
      },
    },
  },
});
