# Sharing SAIL with a collaborator (remote testing)

SAIL runs locally (Vite app + Hono API). To let a collaborator test it from another machine, expose your local app with a free Cloudflare quick tunnel. Your computer + the tunnel must stay running while they test.

## 1. Run both servers (two terminals)
```bash
cd server && npm run dev      # API on :3001  (add ANTHROPIC_API_KEY to server/.env for the live mentor)
cd app    && npm run dev      # app on :5173  (host + tunnel hosts already allowed in vite.config.ts)
```

## 2. Open a public tunnel to the app
```bash
cloudflared tunnel --url http://localhost:5173
```
It prints a URL like `https://<random>.trycloudflare.com`. Send that to your collaborator. The Vite dev server proxies `/api` to the Hono server, so this single URL covers both UI and API.

## Notes
- **Your machine must be on** and both `npm run dev` + the tunnel running. Close them and the link dies.
- **Ephemeral URL**: a quick tunnel gets a new URL each run. For a stable URL, use a named Cloudflare tunnel (needs a Cloudflare account + a domain).
- **Mentor**: without `ANTHROPIC_API_KEY` in `server/.env`, the mentor replies with a dev stub. Add the key (then the server restarts) for the real Claude mentor.
- **Shared data**: all sessions currently use one `studentId` ("demo"), so you and your collaborator share the same session list. Fine for a quick look; needs per-user IDs before a real study.
- **Research data** stays on your machine (SQLite + JSONL in `server/data/`); export anytime at `/api/export`.

## More permanent option (collaborator tests anytime, your machine off)
Deploy the static app (Cloudflare Pages / Vercel) + host the Hono API (Render / Fly / Railway) with `VITE_API_BASE` pointing at the hosted API. Heavier setup; do this when moving toward the actual study deployment (alongside the Canvas LTI path).
