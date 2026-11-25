import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root, server: { host: '127.0.0.1', port: 3016, strictPort: true },
  plugins: [{ name: 'isolated-test-services', enforce: 'pre',
    resolveId(source, importer) {
      const absolute = (source.startsWith('.') && importer ? path.resolve(path.dirname(importer.split('?')[0]), source) : source).replaceAll('\\', '/');
      if (/\/src\/context\/AuthContext(?:\.tsx)?$/.test(absolute)) return path.join(root, 'tests/browser/auth.jsx');
      if (/\/src\/lib\/supabase(?:\.ts)?$/.test(absolute)) return path.join(root, 'tests/browser/supabase.mjs');
    },
    transform(code, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/lib/db.ts')) return code.replace('this.init().catch(console.error);', '');
    }
  }, react()],
  define: { 'process.env.API_KEY': '""', 'process.env.GEMINI_API_KEY': '""' }
});
