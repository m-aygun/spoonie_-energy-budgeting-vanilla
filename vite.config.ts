import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const repository = process.env.GITHUB_REPOSITORY;
  const repositoryName = (repository?.split('/')[1] ?? '').trim();
  const isUserOrOrgPagesRepo = repositoryName.endsWith('.github.io');

  const pagesBase = repositoryName && !isUserOrOrgPagesRepo
    ? `/${repositoryName}/`
    : '/';

  return {
    // Dynamic base fixes blank pages when the GitHub repository name changes.
    base: mode === 'production' ? pagesBase : '/',

    plugins: [react(), tailwindcss()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});