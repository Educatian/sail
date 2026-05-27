import { useEffect, useState } from 'react';
import { Screen, Label, Field, AccentButton, GhostButton, Rule } from '../components/editorial';
import { Reveal } from '../components/ui';
import { api, setStudent } from '../lib/api';

const LOOP = [
  ['1', 'Plan', 'Set one goal, pick the task type, and choose how Marin should coach.'],
  ['2', 'Study', 'Work step by step with questions and hints instead of getting the answer.'],
  ['3', 'Reflect', 'Capture what happened, what to keep, and what to try next.'],
];

const PROOF = [
  ['Students first', 'Built for college and graduate study: seminars, exams, projects, and thesis work.'],
  ['Your data, your choice', 'Spatial context is optional. Exact raw GPS and background tracking are not stored.'],
  ['Evidence driven', 'Progress, calibration, help-seeking, and reflection stay available for research export.'],
];

function RouteMark() {
  return (
    <svg className="pointer-events-none absolute -right-4 top-28 h-56 w-32 text-ink/18 sm:right-0 sm:top-20 sm:h-72 sm:w-44 sm:text-ink/30" viewBox="0 0 180 300" fill="none" aria-hidden="true">
      <path d="M154 10C92 26 82 67 111 102C146 144 129 186 64 212C30 226 18 248 30 284" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="154" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="112" cy="122" r="34" stroke="currentColor" strokeWidth="1.5" />
      <path d="M111 99L123 140L108 131L93 140L111 99Z" fill="var(--color-accent)" />
      <path d="M112 82V94M112 150V162M72 122H84M140 122H152" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Landing({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    void api.track('client_app_opened', { surface: 'landing' });
  }, []);

  function skip() {
    const sid = 'tester-' + Math.random().toString(36).slice(2, 8) + '@sail.dev';
    setStudent(sid);
    void api.track('client_anonymous_started', { surface: 'landing' });
    onAuthed();
  }

  async function enter() {
    setErr('');
    setBusy(true);
    void api.track('client_auth_started', { mode: 'email' });
    try {
      const r = await api.auth(email.trim(), passcode);
      setStudent(r.studentId);
      void api.track('client_auth_completed', { returning: r.returning, mode: 'email' });
      onAuthed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <Screen pad={false}>
      <div className="mx-auto max-w-md px-6 pb-20">
        <div className="relative pt-9">
          <div className="flex items-center justify-between border-b border-black/20 pb-4">
            <div className="font-mono text-[28px] font-semibold uppercase tracking-[0.28em]">SAIL</div>
            <button onClick={() => setShowAccount((v) => !v)} className="label-mono accent">{showAccount ? 'Close' : 'Sign in'}</button>
          </div>

          <RouteMark />

          <Reveal>
            <h1 className="font-display mt-10 max-w-[14ch] text-[4.1rem] font-bold leading-[0.92] tracking-tight">
              Study sessions that learn with you<span className="accent">.</span>
            </h1>
            <p className="mt-6 max-w-[28rem] text-[17px] leading-relaxed text-ink/72">
              Plan one focused session, study with Marin without getting handed answers, then leave with a clearer next move.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 space-y-3">
              <AccentButton onClick={skip}>Start a session</AccentButton>
              <GhostButton onClick={skip}>Try without account</GhostButton>
            </div>
            <div className="mt-5 flex gap-3 text-sm leading-snug text-ink/55">
              <svg className="mt-0.5 h-6 w-6 shrink-0 text-ink/65" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="1.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <path d="M12 14v3" />
              </svg>
              <span>Location and motion are optional. Exact raw GPS is not stored.</span>
            </div>
          </Reveal>

          {showAccount && (
            <Reveal delay={0.04}>
              <div className="mt-8 border-l-2 border-accent pl-4">
                <Label className="mb-5 accent">Save across sessions</Label>
                <div className="space-y-5">
                  <Field label="Email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="off" autoCorrect="off" />
                  <Field label="Passcode" type="password" placeholder="4+ characters" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
                  {err && <p className="text-sm text-accent">{err}</p>}
                  <AccentButton onClick={enter} disabled={busy || !email.trim() || passcode.length < 4}>{busy ? 'Signing in...' : 'Continue with account'}</AccentButton>
                  <p className="text-xs leading-relaxed text-ink/45">A new email creates an account; the same email and passcode signs you back in.</p>
                </div>
              </div>
            </Reveal>
          )}
        </div>

        <Reveal delay={0.16}>
          <div className="mt-14">
            <Rule />
            <Label className="mt-8">A simple loop that builds self-regulated learning</Label>
            <div className="mt-6 space-y-0">
              {LOOP.map(([n, t, d], i) => (
                <div key={n} className="grid grid-cols-[3.5rem_1fr] gap-4 py-5">
                  <div className="relative">
                    <div className="grid h-12 w-12 place-items-center rounded-full border border-ink/45 font-display text-2xl font-bold text-accent">{n}</div>
                    {i < LOOP.length - 1 && <div className="ml-6 mt-1 h-12 w-px bg-ink/25" />}
                  </div>
                  <div>
                    <div className="font-mono text-[13px] font-semibold uppercase tracking-[0.24em] text-ink">{t}</div>
                    <p className="mt-2 text-sm leading-relaxed text-ink/60">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.22}>
          <div className="mt-4">
            <Rule />
            <div className="grid grid-cols-1 divide-y divide-black/12 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {PROOF.map(([t, d]) => (
                <div key={t} className="py-5 sm:px-3">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-ink">{t}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/55">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.28}>
          <div className="mt-4 border-t border-black/12 pt-5 text-xs leading-relaxed text-ink/42">
            SAIL is a research prototype for study planning, in-session coaching, reflection, and learning-context evidence. You can test it without an account.
          </div>
        </Reveal>
      </div>
    </Screen>
  );
}
