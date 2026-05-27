# Deploying SAIL to Cloudflare

SAIL is deployed as a fully serverless prototype.

- Frontend: Cloudflare Pages, static Vite build from `app/`
- Backend: Cloudflare Worker in `worker/`
- Database: Cloudflare D1
- Public prototype: https://sail-dia.pages.dev
- Worker API: https://sail-api.jewoong-moon.workers.dev

## 0. One-Time Auth

```bash
wrangler login
```

This requires Workers, D1, and Pages scopes.

## 1. Backend, Worker + D1

```bash
cd worker
npm install
wrangler d1 create sail
npm run db:init:remote
wrangler secret put OPENROUTER_API_KEY
wrangler secret put RESEND_API_KEY
npm run deploy
```

The D1 binding is configured in `worker/wrangler.toml`. Secrets are not stored in this repository.

## 2. Frontend, Pages

```bash
cd app
echo "VITE_API_BASE=https://sail-api.jewoong-moon.workers.dev" > .env.production
npm install
npm run build
npx wrangler pages deploy dist --project-name sail-dia
```

## Updating Later

```bash
cd worker
npm run deploy

cd ../app
npm run build
npx wrangler pages deploy dist --project-name sail-dia
```

## Research Data Notes

- Data lives in D1.
- Export routes are available through the Worker API.
- Raw secrets and local SQLite/log files should not be committed.
- Exact raw GPS should not be stored; telemetry payloads are sanitized before persistence.
