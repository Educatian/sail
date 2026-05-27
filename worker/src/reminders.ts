import type { StudySession } from './domain';

const APP_URL = 'https://sail-dia.pages.dev';

export interface DueReminder { subject: string; days: number; adjustment?: string }

/** Spacing: most-overdue subject (newest completed session per subject, >= 2 days old). */
export function dueReminder(sessions: StudySession[]): DueReminder | null {
  const completed = sessions.filter((s) => s.completed);
  const seen = new Set<string>();
  let best: DueReminder | null = null;
  for (const s of completed) {
    if (seen.has(s.subject)) continue;
    seen.add(s.subject);
    const days = Math.floor((Date.now() - new Date(s.updatedAt).getTime()) / 86400000);
    if (days >= 2 && (!best || days > best.days)) best = { subject: s.subject, days, adjustment: s.adjustment };
  }
  return best;
}

/** The reminder email IS the scaffold: a retrieval + planning metacognitive nudge. */
export function reminderEmail(due: DueReminder): { subject: string; html: string; text: string } {
  const subject = `SAIL: time to revisit ${due.subject}?`;
  const plan = due.adjustment ? `Last time you planned: “${due.adjustment}”.` : '';
  const text =
    `It's been ${due.days} days since you studied ${due.subject}.\n\n` +
    `Before you reopen your notes, a 30-second retrieval: try to recall ONE key idea from last time, from memory.\n` +
    `Then name your goal for the next session in one line.\n\n` +
    `${plan}\n\nChart your next session: ${APP_URL}\n\n— Marin, your SAIL mentor`;
  const html =
    `<div style="font-family:ui-sans-serif,system-ui,Arial;max-width:520px;margin:0 auto;color:#0b0b0c">` +
    `<div style="font-family:ui-monospace,monospace;letter-spacing:.2em;font-size:11px;color:#888">SAIL</div>` +
    `<h2 style="font-weight:700;letter-spacing:-.02em;margin:6px 0 14px">Time to revisit ${escapeHtml(due.subject)}?</h2>` +
    `<p>It's been <b>${due.days} days</b> since you studied <b>${escapeHtml(due.subject)}</b>.</p>` +
    `<p style="border-left:3px solid #ff3b2e;padding-left:12px;color:#333">` +
    `A 30-second retrieval first: recall <b>one key idea</b> from last time, from memory. Then name your goal for the next session in one line.</p>` +
    (plan ? `<p style="color:#555">${escapeHtml(plan)}</p>` : '') +
    `<p style="margin-top:18px"><a href="${APP_URL}" style="background:#ff3b2e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Chart your next session →</a></p>` +
    `<p style="color:#999;font-size:12px;margin-top:18px">Marin, your SAIL mentor</p></div>`;
  return { subject, html, text };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/** Send via Resend. Returns true if sent, false if no key (dev) or error. */
export async function sendEmail(env: { RESEND_API_KEY?: string; RESEND_FROM?: string }, to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) { console.log(`[reminder dev-stub] to=${to} subject="${subject}"`); return false; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM || 'SAIL <onboarding@resend.dev>', to, subject, html, text }),
  });
  if (!res.ok) { console.log(`[reminder send failed ${res.status}] to=${to}`); return false; }
  return true;
}
