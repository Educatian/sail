import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api, streamMarin } from '../lib/api';
import { canInterrupt, spendInterruption } from '../lib/friction';
import { MarinMark } from './MarinMark';
import { MarinLoader } from './MarinLoader';

export type MarinMode = 'ask' | 'goal_setup' | 'reflection' | 'onboarding' | 'stretch' | 'plan';
type Turn = { role: 'user' | 'assistant'; content: string };
type GoalAction = { type: 'create_course_goal'; title: string; distal: string; subgoals: string[] };
type SessionAction = { type: 'create_session'; subject: string; goals: string[]; strategies?: string[]; plannedMinutes?: number; courseId?: string; subgoalId?: string };
type MarinAction = GoalAction | SessionAction;
type FeelingProbe = { feeling: 'knowing' | 'difficulty' | 'confidence'; prompt: string; phase?: 'pre' | 'post' };

const TITLES: Record<MarinMode, string> = {
  ask: 'Ask Marin',
  goal_setup: 'Chart a course with Marin',
  reflection: 'Reflect with Marin',
  onboarding: 'Welcome — meet Marin',
  stretch: 'Stretch with Marin',
  plan: 'Plan a session with Marin',
};
const PLACEHOLDER: Record<MarinMode, string> = {
  ask: 'Ask about your plan, progress, or a strategy…',
  goal_setup: 'Tell Marin the course and what you want to achieve…',
  reflection: 'How did it go?',
  onboarding: 'Say hi, or name a course you’re studying…',
  stretch: 'Try it before Marin tells you…',
  plan: 'Tell Marin what you want to study…',
};

// strip control tags + fenced action/probe blocks from what the learner sees
const clean = (t: string) => t.replace(/\[\[(LABEL|STATE):[^\]]*\]\]/g, '').replace(/```(action|probe)[\s\S]*?```/g, '').trim();
function parseAction(t: string): MarinAction | null {
  const m = /```action\s*([\s\S]*?)```/.exec(t);
  if (!m) return null;
  try {
    const o = JSON.parse(m[1].trim());
    if (o?.type === 'create_course_goal' && o.title && o.distal) return o as GoalAction;
    if (o?.type === 'create_session' && o.subject && Array.isArray(o.goals)) return o as SessionAction;
    return null;
  } catch { return null; }
}
function parseProbe(t: string): FeelingProbe | null {
  const m = /```probe\s*([\s\S]*?)```/.exec(t);
  if (!m) return null;
  try { const o = JSON.parse(m[1].trim()); return ['knowing', 'difficulty', 'confidence'].includes(o?.feeling) && o.prompt ? o : null; } catch { return null; }
}

export function MarinChat({ mode, sessionId, onClose, onAction, onSessionCreated }: { mode: MarinMode; sessionId?: string; onClose: () => void; onAction?: () => void; onSessionCreated?: (id: string) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');           // streaming assistant text
  const [action, setAction] = useState<MarinAction | null>(null);
  const [probe, setProbe] = useState<FeelingProbe | null>(null);
  const [created, setCreated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, draft]);

  async function run(history: Turn[]) {
    setStreaming(true); setDraft('');
    try {
      const full = await streamMarin(mode, history, (so) => setDraft(clean(so)), { sessionId });
      const act = (mode === 'goal_setup' || mode === 'plan') ? parseAction(full) : null;
      // Stretch probes share the per-session friction budget with in-session check-ins,
      // so a learner is never peppered. The stretch dialogue itself always continues;
      // only the 1-5 feeling tap is suppressed once the budget is spent.
      const prb = mode === 'stretch' && sessionId && canInterrupt(sessionId) ? parseProbe(full) : null;
      setTurns([...history, { role: 'assistant', content: clean(full) }]);
      setDraft('');
      if (act) setAction(act);
      if (prb) { spendInterruption(sessionId!); setProbe(prb); }
    } catch { setTurns([...history, { role: 'assistant', content: 'Sorry, I could not reach the mentor just now.' }]); setDraft(''); }
    finally { setStreaming(false); }
  }
  // auto-open with Marin speaking first
  useEffect(() => { if (opened.current) return; opened.current = true; void run([]); /* eslint-disable-next-line */ }, []);

  function send(text: string) {
    const t = text.trim(); if (!t || streaming) return;
    setInput(''); setAction(null); setProbe(null);
    void run([...turns, { role: 'user', content: t }]);
  }
  function answerProbe(value: number) {
    if (!probe) return;
    void api.track('metacog_experience', { feeling: probe.feeling, value, phase: probe.phase ?? 'pre', mode }, sessionId);
    const label = probe.feeling === 'knowing' ? 'feeling of knowing' : probe.feeling === 'difficulty' ? 'difficulty' : 'confidence';
    setProbe(null);
    send(`[${label}: ${value}/5]`);
  }

  async function confirmAction() {
    if (!action) return;
    if (action.type === 'create_session') {
      const s = await api.createSession({
        subject: action.subject,
        goals: action.goals.slice(0, 5),
        strategies: (action.strategies ?? []).slice(0, 4) as never,
        plannedMinutes: action.plannedMinutes ?? 25,
        courseId: action.courseId,
        subgoalId: action.subgoalId,
      });
      setCreated(true); setAction(null);
      onSessionCreated?.(s.id);
      setTurns((p) => [...p, { role: 'assistant', content: `Your session "${action.subject}" is planned. Starting it now — good luck!` }]);
      return;
    }
    const course = await api.createCourse(action.title);
    await api.createGoal({ courseId: course.id, distal: action.distal, subgoals: action.subgoals.slice(0, 4) });
    setCreated(true); setAction(null);
    onAction?.();
    setTurns((p) => [...p, { role: 'assistant', content: `Done — "${action.title}" is charted with ${action.subgoals.length} subgoals. You'll see it on your home screen and in the goal picker.` }]);
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <button aria-label="Close" className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
        <motion.div
          className="relative flex max-h-[86vh] flex-col rounded-t-3xl border-t border-black/12 bg-canvas"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-black/15" />
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/12 text-accent"><MarinMark className="h-5 w-5" /></span>
              <div>
                <div className="label-mono accent">Marin</div>
                <div className="font-display text-lg font-medium">{TITLES[mode]}</div>
              </div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-black/15 text-ink/50">✕</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-3">
            {turns.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} className="flex justify-end"><div className="max-w-[82%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-canvas">{m.content}</div></div>
              ) : (
                <div key={i} className="max-w-[88%] rounded-2xl rounded-bl-sm border border-black/15 px-4 py-2.5 text-sm whitespace-pre-wrap">{m.content}</div>
              )
            ))}
            {streaming && <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-black/15 px-4 py-2.5 text-sm whitespace-pre-wrap">{draft || <MarinLoader size={24} label="Marin is thinking" />}</div>}
            {probe && !streaming && (
              <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3">
                <p className="text-sm font-medium">{probe.prompt}</p>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => answerProbe(n)} className="h-9 w-9 rounded-full border border-black/25 text-sm text-ink/65 hover:border-accent hover:text-accent">{n}</button>
                  ))}
                </div>
                <p className="label-mono mt-1.5">1 = low · 5 = high</p>
              </div>
            )}
            {action && !created && action.type === 'create_course_goal' && (
              <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3">
                <div className="label-mono accent">Create this course goal?</div>
                <p className="mt-1.5 text-sm font-medium">{action.title}</p>
                <p className="text-sm text-ink/70">{action.distal}</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm text-ink/60">{action.subgoals.map((s, i) => <li key={i}>{s}</li>)}</ul>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={confirmAction} className="btn-accent px-4 py-2 text-xs uppercase tracking-wide">Create it</button>
                  <button onClick={() => setAction(null)} className="rounded-md border border-black/15 px-4 py-2 text-xs uppercase tracking-wide text-ink/60">Keep talking</button>
                </div>
              </div>
            )}
            {action && !created && action.type === 'create_session' && (
              <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3">
                <div className="label-mono accent">Start this session?</div>
                <p className="mt-1.5 text-sm font-medium">{action.subject}</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm text-ink/60">{action.goals.map((g, i) => <li key={i}>{g}</li>)}</ul>
                <p className="mt-1.5 text-xs text-ink/55">{(action.strategies ?? []).join(', ') || 'no strategy'} · {action.plannedMinutes ?? 25} min</p>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={confirmAction} className="btn-accent px-4 py-2 text-xs uppercase tracking-wide">Start session</button>
                  <button onClick={() => setAction(null)} className="rounded-md border border-black/15 px-4 py-2 text-xs uppercase tracking-wide text-ink/60">Keep talking</button>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-black/12 px-3 py-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={streaming ? 'Marin is replying…' : PLACEHOLDER[mode]} disabled={streaming}
              className="min-w-0 flex-1 rounded-full border border-black/20 bg-transparent px-4 py-2.5 text-base outline-none focus:border-accent" />
            <button disabled={streaming || !input.trim()} className="btn-accent grid h-11 w-11 shrink-0 place-items-center text-lg disabled:opacity-40">↑</button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
