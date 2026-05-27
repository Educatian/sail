import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Screen, TopBar, Rule, Label, Stat, AccentButton, Row } from '../components/editorial';
import { CountUp, Reveal } from '../components/ui';
import { api, apiUrl, studentQuery, getStudent, clearStudent, type LearnerModel, type Stats } from '../lib/api';
import type { StudySession, Profile } from '../domain';

export function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<StudySession[] | null>(null);
  const [learner, setLearner] = useState<LearnerModel | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [testMsg, setTestMsg] = useState('');
  useEffect(() => {
    api.listSessions().then(setSessions).catch(() => setSessions([]));
    api.getLearner().then(setLearner).catch(() => {});
    api.getProfile().then(setProfile).catch(() => setProfile(null));
    api.getStats().then(setStats).catch(() => {});
  }, []);
  const needsBaseline = profile !== undefined && (!profile || !profile.items?.length);
  const remindersOn = profile?.remindersOn ?? true;
  const [query, setQuery] = useState('');
  const filtered = (sessions ?? []).filter((s) => s.subject.toLowerCase().includes(query.trim().toLowerCase()));

  async function renameSession(s: StudySession) {
    const name = window.prompt('Rename session', s.subject)?.trim();
    if (!name || name === s.subject) return;
    await api.patchSession(s.id, { subject: name });
    setSessions((prev) => (prev ?? []).map((x) => (x.id === s.id ? { ...x, subject: name } : x)));
  }
  async function deleteSession(s: StudySession) {
    if (!window.confirm(`Delete "${s.subject}"? This removes its goals, chat, and logs.`)) return;
    await api.deleteSession(s.id);
    setSessions((prev) => (prev ?? []).filter((x) => x.id !== s.id));
  }

  const has = sessions && sessions.length > 0;
  const completed = sessions?.filter((s) => s.completed).length ?? 0;
  const totalMin = sessions?.reduce((a, s) => a + s.actualMinutes, 0) ?? 0;
  const goalsSet = sessions?.reduce((a, s) => a + s.goals.length, 0) ?? 0;
  const goalsDone = sessions?.reduce((a, s) => a + s.goals.filter((g) => g.isTicked).length, 0) ?? 0;
  const goalPct = goalsSet ? Math.round((goalsDone / goalsSet) * 100) : 0;

  return (
    <Screen>
      <TopBar
        section="00"
        title="Overview"
        right={<button onClick={() => { clearStudent(); location.reload(); }} className="label-mono accent">Log out</button>}
      />

      <div className="px-5 pt-7">
        <Reveal>
          <Stat size="hero" value={<CountUp value={totalMin} />} caption="Minutes on task" />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-7 grid grid-cols-3 divide-x divide-black/12">
            <div className="pr-3"><Stat size="sm" value={<CountUp value={sessions?.length ?? 0} />} caption="Sessions" /></div>
            <div className="px-3"><Stat size="sm" value={<CountUp value={completed} />} caption="Reflected" /></div>
            <div className="pl-3"><Stat size="sm" value={<CountUp value={goalPct} suffix="%" />} caption="Goals met" /></div>
          </div>
        </Reveal>

        {stats && stats.gamification.xp > 0 && (
          <Reveal delay={0.11}>
            <div className="mt-6 flex items-center gap-4 border-t border-black/[0.07] pt-4">
              <span className="num text-2xl">🔥 {stats.gamification.streakDays}<span className="text-sm text-ink/40"> day{stats.gamification.streakDays === 1 ? '' : 's'}</span></span>
              <span className="num text-2xl">Lv {stats.gamification.level}</span>
              <span className="label-mono ml-auto">{stats.gamification.xp} XP · best {stats.gamification.longestStreak}d</span>
            </div>
          </Reveal>
        )}

        <Reveal delay={0.14}>
          <div className="mt-7"><AccentButton onClick={() => navigate({ to: '/study/new' })}>+ New session</AccentButton></div>
        </Reveal>

        {needsBaseline && (
          <Reveal delay={0.18}>
            <button onClick={() => navigate({ to: '/intake' })} className="mt-4 flex w-full items-center justify-between border-l-2 border-accent pl-4 text-left">
              <span className="text-sm">Set your baseline <span className="text-ink/50">(1 min, research)</span></span>
              <span className="text-ink/30">→</span>
            </button>
          </Reveal>
        )}
      </div>

      {learner && learner.spacing.length > 0 && (
        <>
          <div className="mt-10 px-5"><Label>/ Review due · spacing</Label></div>
          <Rule className="mt-3" />
          {learner.spacing.map((sp) => (
            <Row key={sp.subject} onClick={() => navigate({ to: '/study/new' })}>
              <div className="flex-1"><span className="font-display font-medium">{sp.subject}</span></div>
              <span className="label-mono">{sp.daysSince}D AGO →</span>
            </Row>
          ))}
        </>
      )}

      <div className="mt-10 flex items-end justify-between px-5">
        <Label>/ {has ? 'Recent' : 'Get started'}</Label>
        {has && <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search…" className="w-32 border-b border-black/15 bg-transparent pb-0.5 text-right text-sm outline-none placeholder:text-ink/30 focus:border-accent" />}
      </div>
      <Rule className="mt-3" />

      {sessions === null && <div className="px-5 py-6"><Label>Loading…</Label></div>}

      {sessions && sessions.length === 0 && (
        <div className="px-5 py-6">
          <p className="text-sm text-ink/60">SAIL turns college and graduate study into a self-regulated loop. Use it for coursework, seminar reading, exam prep, research writing, or thesis work.</p>
          <div className="mt-5 space-y-5">
            {[
              { n: '01', t: 'Chart', d: 'Set goals, pick a strategy, plan your time (forethought).' },
              { n: '02', t: 'Sail', d: 'Study with Marin, a mentor that asks and hints, never hands you the answer (performance).' },
              { n: '03', t: 'Log', d: 'Rate, reflect, and decide what to change next time (reflection).' },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="num accent text-2xl">{s.n}</span>
                <div>
                  <div className="font-display font-medium">{s.t}</div>
                  <div className="mt-0.5 text-sm text-ink/55">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-ink/45">Your next plan carries into the next session, and Marin fades its help as you grow.</p>
        </div>
      )}

      {has && filtered.length === 0 && <div className="px-5 py-6"><Label>No match for “{query}”</Label></div>}

      {has && filtered.map((s, i) => (
        <Reveal key={s.id} delay={Math.min(i * 0.04, 0.25)}>
          <div className="flex items-center gap-1 border-b border-black/[0.07] px-5 py-4">
            <button onClick={() => navigate({ to: s.completed ? '/study/reflect/$id' : '/study/active/$id', params: { id: s.id } })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <div className="min-w-0 flex-1">
                <div className="font-display truncate text-lg font-medium">{s.subject}</div>
                <div className="label-mono mt-1">{s.date} · {s.actualMinutes}M · {s.goals.filter((g) => g.isTicked).length}/{s.goals.length} GOALS{s.completed ? ' · DONE' : s.inProgress ? ' · LIVE' : ''}</div>
              </div>
              <span className={`label-mono ${s.condition === 'metacog' ? 'accent' : ''}`}>{s.condition}</span>
            </button>
            <button onClick={() => renameSession(s)} title="Rename" className="px-1.5 text-ink/30 hover:text-ink">✎</button>
            <button onClick={() => deleteSession(s)} title="Delete" className="px-1.5 text-ink/30 hover:text-accent">✕</button>
          </div>
        </Reveal>
      ))}

      <div className="mt-10 px-5"><Label>/ Email reminders</Label></div>
      <Rule className="mt-3" />
      <div className="px-5 py-4">
        <button onClick={async () => { const p = await api.setReminders(!remindersOn); setProfile(p); }} className="flex w-full items-center justify-between text-left">
          <span className="text-sm">Spacing-based scaffold emails to <span className="text-ink/50">{getStudent()}</span></span>
          <span className={`label-mono ${remindersOn ? 'accent' : 'text-ink/40'}`}>{remindersOn ? 'ON' : 'OFF'}</span>
        </button>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={async () => { setTestMsg('Sending…'); try { const r = await api.testReminder(); setTestMsg(r.sent ? 'Sent to your inbox ✓' : 'Preview ready (no email key set yet)'); } catch { setTestMsg('Failed'); } }} className="btn-ghost px-4 py-2 text-xs uppercase tracking-wide">Send test</button>
          {testMsg && <span className="label-mono normal-case tracking-normal" style={{ letterSpacing: 0 }}>{testMsg}</span>}
        </div>
      </div>

      <div className="px-5 py-8">
        <Label>Research</Label>
        <div className="mt-2 text-sm text-ink/55">
          <button onClick={() => navigate({ to: '/research' })} className="underline decoration-black/20 underline-offset-4">Evidence view</button>
          {'   ·   '}
          <a href={apiUrl('/api/export' + studentQuery())} className="underline decoration-black/20 underline-offset-4">Export JSON</a>
          {'   ·   '}
          <a href={apiUrl('/api/export.csv')} className="underline decoration-black/20 underline-offset-4">Events CSV</a>
          <span className="ml-2 opacity-40">· {getStudent()}</span>
        </div>
      </div>
    </Screen>
  );
}
