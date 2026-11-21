import { copyFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Project site is served at /career-roadmap-ai/ on GitHub Pages. */
export const BASE_PATH = '/career-roadmap-ai/';

function githubPagesSpaFallback() {
  let outDir = 'dist';
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  base: BASE_PATH,
  plugins: [react(), githubPagesSpaFallback()],
});
