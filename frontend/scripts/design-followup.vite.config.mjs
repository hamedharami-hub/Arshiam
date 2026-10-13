import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run only for local QA. Never included in the application build/configuration.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adapters = new Set(['firebaseStore', 'firestoreDataService', 'firestoreLive', 'offlineQueue', 'noteTaskLinkService']);
export default defineConfig({
  root,
  cacheDir: process.env.QA_VITE_CACHE ?? path.join(process.env.LOCALAPPDATA, 'Temp/opencode/arshiam-followup-vite-cache'),
  plugins: [{
    name: 'synthetic-notes-data-only',
    enforce: 'pre',
    transform(code, id) {
      code = code.replaceAll('@/hooks/useAuth', '@/test/notes-benchmark-adapter');
      if (!id.replaceAll('\\', '/').endsWith('/pages/NotesView.tsx')) return code;
      for (const name of adapters) code = code.replaceAll(`@/lib/${name}`, '@/test/notes-benchmark-adapter');
      return code;
    },
  }, react()],
  resolve: { alias: { '@': path.join(root, 'src') }, dedupe: ['react', 'react-dom'] },
  optimizeDeps: { entries: ['src/test/notes-benchmark.html', 'src/test/contrast-audit.html'] },
  server: { host: '127.0.0.1', port: 3012, strictPort: true, hmr: false },
});
