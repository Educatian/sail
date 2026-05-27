import './env.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { api } from './routes.js';
import { llmEnabled, modelName } from './llm.js';

const app = new Hono();
app.use('/api/*', cors());
app.get('/health', (c) => c.json({ ok: true, llm: llmEnabled, model: modelName }));
app.route('/api', api);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`SAIL server on http://localhost:${port}  (llm=${llmEnabled ? modelName : 'dev-stub'})`);
