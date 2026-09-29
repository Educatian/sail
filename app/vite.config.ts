import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Study build (VITE_CODED_IDS=1 or VITE_STUDY_BUILD=1): strip the Google Fonts links so participant devices make no third-party requests.
function stripExternalFonts(study: boolean): Plugin {
  return {
    name: 'strip-external-fonts',
    transformIndexHtml(html) {
      return study ? html.replace(/[ \t]*<link[^>]*(fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\r?\n?/g, '') : html;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const study = env.VITE_CODED_IDS === '1' || env.VITE_STUDY_BUILD === '1';
  return {
  plugins: [react(), tailwindcss(), stripExternalFonts(study)],
  server: {
    host: true,              // listen on LAN so a tunnel/other devices can reach it
    allowedHosts: true,      // allow Cloudflare/ngrok tunnel hostnames
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  };
});
