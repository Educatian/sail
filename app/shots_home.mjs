import { chromium } from 'playwright';
const API = 'http://localhost:3001', APP = 'http://localhost:5173';
const OUT = 'C:/Users/jewoo/Projects/sail/screenshots';
const SID = 'clean-demo';
const api = (p, m = 'GET', b) => fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then(r => r.json());

async function seedDone(subject, strategies, goals, tick, ratings, useful, adj, notes) {
  const s = await api('/api/sessions', 'POST', { subject, condition: 'metacog', goals, strategies, plannedMinutes: 30, studentId: SID });
  const g = s.goals.map((x, i) => ({ ...x, isTicked: i < tick }));
  await api('/api/sessions/' + s.id, 'PATCH', { goals: g, timerSegments: [{ startTime: new Date(Date.now() - 1700000).toISOString(), endTime: new Date().toISOString() }], ...ratings, usefulStrategy: useful, adjustment: adj, notes, completed: true, inProgress: false, studentId: SID });
  return s.id;
}
await seedDone('Calculus — limits', ['self_explanation', 'retrieval_practice'], ['Grok epsilon-delta', 'Work 5 limit problems'], 2, { focus: 4, progress: 4, satisfaction: 5 }, 'retrieval_practice', 'Start with retrieval, not re-reading.', 'Clicked once I explained it aloud.');
await seedDone('Organic chemistry', ['worked_example', 'spaced'], ['SN1 vs SN2', 'Mechanism flashcards'], 1, { focus: 3, progress: 3, satisfaction: 3 }, 'worked_example', 'Interleave SN1/SN2.', 'Worked examples helped.');
try { const c = await api('/api/courses', 'POST', { title: 'Linear Algebra', studentId: SID }); await api('/api/goals', 'POST', { courseId: c.id, distal: 'Master eigen-decomposition by the midterm', subgoals: ['eigenvalues by hand', 'diagonalization', 'SVD intuition'], studentId: SID }); } catch {}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((sid) => { localStorage.setItem('sail-student', sid); }, SID);
const page = await ctx.newPage();
const shot = async (n) => { await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); console.log('shot', n); };
await page.goto(APP + '/', { waitUntil: 'networkidle' }); await shot('clean-01-home');
await page.goto(APP + '/dashboard', { waitUntil: 'networkidle' }); await shot('clean-02-dashboard');
await browser.close(); console.log('DONE');
