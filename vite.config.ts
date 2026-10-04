import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Ships a copy of the app as 404.html. If the host's rewrite rule is missing
 * (Render ignores public/_redirects), opening or refreshing /join, /create,
 * /profile, etc. still loads the app instead of the host's plain "Not Found".
 */
function spaFallback404(): Plugin {
  return {
    name: 'friend11-spa-404-fallback',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index && index.type === 'asset') {
        this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback404()],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});