import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const API = 'http://localhost:3001';
const APP = 'http://localhost:5173';
const OUT = 'C:/Users/jewoo/Projects/sail/screenshots';
mkdirSync(OUT, { recursive: true });

async function api(path, method = 'GET', body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}
async function seedCompleted(subject, strategies, goalsTexts, tick, ratings, useful, adjustment, notes) {
  const s = await api('/api/sessions', 'POST', { subject, condition: 'metacog', goals: goalsTexts, strategies, plannedMinutes: 30 });
  const goals = s.goals.map((g, i) => ({ ...g, isTicked: i < tick }));
  const segs = [{ startTime: new Date(Date.now() - 1700000).toISOString(), endTime: new Date().toISOString() }];
  await api('/api/sessions/' + s.id, 'PATCH', { goals, timerSegments: segs, ...ratings, usefulStrategy: useful, adjustment, notes, completed: true, inProgress: false });
  return s.id;
}

// ---- seed demo data ----
const calcId = await seedCompleted('Calculus — limits', ['self_explanation', 'retrieval_practice'], ['Grok the epsilon-delta definition', 'Work 5 limit problems'], 2, { focus: 4, progress: 4, satisfaction: 5 }, 'retrieval_practice', 'Start with retrieval practice, not re-reading.', 'Epsilon-delta finally clicked once I tried explaining it aloud.');
await seedCompleted('Organic chemistry', ['worked_example', 'spaced'], ['SN1 vs SN2', 'Mechanism flashcards'], 1, { focus: 3, progress: 3, satisfaction: 3 }, 'worked_example', 'Interleave SN1/SN2 problems instead of blocking.', 'Worked examples helped; flashcards felt passive.');
const act = await api('/api/sessions', 'POST', { subject: 'Linear algebra — eigenvectors', condition: 'metacog', goals: ['Understand eigen-decomposition', 'Compute eigenvalues by hand'], strategies: ['self_explanation'], plannedMinutes: 25 });

// ---- capture ----
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const shot = async (name) => { await page.waitForTimeout(750); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); console.log('shot', name); };

await page.goto(APP + '/', { waitUntil: 'networkidle' });
await shot('01-home');

await page.goto(APP + '/study/new', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.getByPlaceholder('Calculus — limits').fill('Probability — Bayes theorem').catch(() => {});
await shot('02-goal-studio_carry-forward');

await page.goto(APP + `/study/active/${act.id}`, { waitUntil: 'networkidle' });
await page.getByText('Start studying').click().catch(() => {});
await page.waitForTimeout(400);
const inp = page.getByPlaceholder('Ask Marin…');
await inp.fill('Can you just tell me the answer to problem 3?');
await inp.press('Enter');
await page.waitForTimeout(1600);
await shot('03-active-mentor');

await page.goto(APP + `/study/reflect/${calcId}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await shot('04-reflection');

await page.goto(APP + '/dashboard', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await shot('05-dashboard');

await browser.close();
console.log('DONE ->', OUT);
