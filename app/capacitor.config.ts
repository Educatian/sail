import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sail.srlmentor',
  appName: 'SAIL',
  webDir: 'dist',
  // --- Quick on-device testing (live reload) ---
  // Run `npm run dev -- --host` and the server on the same Wi-Fi, then set your laptop's LAN IP here
  // so the installed app loads the live UI (and Vite proxies /api -> :3001). Comment out for a bundled build.
  // server: { url: 'http://192.168.0.10:5173', cleartext: true },
};

export default config;
