import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Screen, TopBar, Label, Field, TextArea, Tag, Slider, AccentButton, Rule } from '../components/editorial';
import { Reveal } from '../components/ui';
import { Confetti } from '../components/Confetti';
import { api } from '../lib/api';
import { STRATEGY_LABELS } from '../domain';
import type { MobilityState, PlaceCategory, Rating, SpatialTrace, StrategyKind, StudySession } from '../domain';

const SCALES = [
  { key: 'focus', label: 'Focus — how concentrated?' },
  { key: 'progress', label: 'Progress — how much learned?' },
  { key: 'satisfaction', label: 'Satisfaction — how do you feel?' },
] as const;

const PLACES: { value: PlaceCategory; label: string }[] = [
  { value: 'stable_study', label: 'Library / study spot' },
  { value: 'classroom', label: 'Classroom / lab' },
  { value: 'home_like', label: 'Home / dorm' },
  { value: 'transit', label: 'On the move' },
  { value: 'work_social', label: 'Work / social space' },
  { value: 'other', label: 'Other' },
  { value: 'not_shared', label: 'Do not record' },
];

const MOBILITY: { value: MobilityState; label: string }[] = [
  { value: 'still', label: 'Mostly still' },
  { value: 'moving', label: 'Moving around' },
  { value: 'unknown', label: 'Not sure' },
];

export function Reflection() {
  const { id } = useParams({ from: '/study/reflect/$id' });
  const navigate = useNavigate();
  const [s, setS] = useState<StudySession | null>(null);
  const [ratings, setRatings] = useState<Record<string, Rating | undefined>>({});
  const [notes, setNotes] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [useful, setUseful] = useState<StrategyKind | undefined>(undefined);
  const [performance, setPerformance] = useState(50); // actual mastery 0-100 (post-task)
  const [contextHelpfulness, setContextHelpfulness] = useState(3);
  const [contextReflection, setContextReflection] = useState('');
  const [learnerModelCorrection, setLearnerModelCorrection] = useState('');
  const [placeCategory, setPlaceCategory] = useState<PlaceCategory>('not_shared');
  const [placeLabel, setPlaceLabel] = useState('');
  const [mobilityState, setMobilityState] = useState<MobilityState>('unknown');
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const openedLoggedRef = useRef(false);

  useEffect(() => {
    api.getSession(id).then((sess) => {
      setS(sess); setRatings({ focus: sess.focus, progress: sess.progress, satisfaction: sess.satisfaction });
      setNotes(sess.notes ?? ''); setAdjustment(sess.adjustment ?? ''); setUseful(sess.usefulStrategy);
      setContextHelpfulness(sess.contextHelpfulness ?? 3);
      setContextReflection(sess.contextReflection ?? '');
      setLearnerModelCorrection(sess.learnerModelCorrection ?? '');
      setPlaceCategory(sess.contextTrace?.placeCategory ?? 'not_shared');
      setPlaceLabel(sess.contextTrace?.placeLabel ?? '');
      setMobilityState(sess.spatialTrace?.mobilityState ?? 'unknown');
      const fallback = sess.goals.length ? Math.round((sess.goals.filter((g) => g.isTicked).length / sess.goals.length) * 100) : 50;
      setPerformance(sess.performanceActual ?? fallback);
      if (!openedLoggedRef.current) {
        openedLoggedRef.current = true;
        void api.track('reflection_changed', { action: 'reflection_opened', goalsDone: sess.goals.filter((g) => g.isTicked).length, goalsTotal: sess.goals.length }, id, sess.condition);
      }
    });
  }, [id]);

  if (!s) return <Screen><div className="px-5 py-10"><Label>Loading…</Label></div></Screen>;
  const session = s;
  const done = session.goals.filter((g) => g.isTicked).length;
  const metacog = session.condition === 'metacog';

  async function save() {
    setBusy(true);
    try {
      const spatialTrace: SpatialTrace | undefined = session.spatialTrace
        ? { ...session.spatialTrace, mobilityState, rawLocationStored: false }
        : undefined;
      void api.track('reflection_changed', {
        action: 'reflection_submitted',
        hasNotes: notes.trim().length > 0,
        hasAdjustment: adjustment.trim().length > 0,
        hasLearnerCorrection: learnerModelCorrection.trim().length > 0,
        contextHelpfulness,
        mobilityState,
        placeCategory,
        performanceActual: performance,
      }, id, session.condition);
      await api.patchSession(id, {
        ...ratings,
        notes,
        adjustment,
        usefulStrategy: useful,
        performanceActual: performance,
        contextHelpfulness: contextHelpfulness as Rating,
        contextReflection,
        learnerModelCorrection,
        contextTrace: {
          placeCategory,
          placeLabel: placeLabel.trim() || undefined,
          intentionallyChosen: session.contextTrace?.intentionallyChosen,
          rawLocationStored: false,
        },
        spatialTrace,
        completed: true,
        inProgress: false,
      });
      try { navigator.vibrate?.([40, 30, 60]); } catch { /* no haptics */ }
      setCelebrate(true);
      setTimeout(() => navigate({ to: '/' }), 1100);
    } catch { setBusy(false); }
  }

  return (
    <Screen>
      {celebrate && <Confetti />}
      <TopBar section="03" title="Reflect" left={<button onClick={() => navigate({ to: '/study/active/$id', params: { id } })} className="mr-1 text-lg text-ink/50">←</button>} />

      <div className="px-5 pt-6">
        <div className="label-mono">{s.subject} · {s.actualMinutes}M · {done}/{s.goals.length} GOALS</div>

        <Reveal delay={0.05}>
          <div className="mt-6 border-l-2 border-accent pl-4">
            <Label className="accent">Marin · your mentor</Label>
            <p className="mt-1.5 text-sm">
              {metacog
                ? 'Where did your chosen strategy help, and where did it fall short? Name one concrete change for next time.'
                : "What's one thing that went well, and one thing you'd do differently next time?"}
            </p>
          </div>
        </Reveal>

        <div className="mt-8 space-y-6">
          {SCALES.map(({ key, label }) => (
            <div key={key}>
              <Label className="mb-2">{label}</Label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as Rating[]).map((n) => (
                  <button key={n} onClick={() => setRatings((r) => ({ ...r, [key]: n }))}
                    className={`h-11 flex-1 rounded-md border text-sm transition-colors ${ratings[key] === n ? 'border-ink bg-ink font-semibold text-canvas' : 'border-black/20 text-ink/55'}`}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Slider label="What % of your goals did you actually master?" value={performance} onChange={setPerformance} suffix="%" />
          {s.confidencePre != null && (
            <p className="label-mono mt-3 normal-case tracking-normal" style={{ letterSpacing: 0 }}>
              Predicted {s.confidencePre}% · actual {performance}% · <span className="accent">calibration error {Math.abs(s.confidencePre - performance)}</span>
            </p>
          )}
        </div>

        {s.strategies.length > 0 && (
          <div className="mt-8">
            <Label className="mb-3">Which strategy helped most?</Label>
            <div className="flex flex-wrap gap-2">
              {s.strategies.map((st) => (
                <Tag key={st.id} active={useful === st.kind} onClick={() => setUseful((u) => (u === st.kind ? undefined : st.kind))}>{STRATEGY_LABELS[st.kind]}</Tag>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <TextArea label="Notes — what you learned / got stuck" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {(s.contextTrace || s.spatialTrace) && (
            <>
              <div>
                <Label className="mb-2">Was this context right?</Label>
                <div className="flex flex-wrap gap-2">
                  {PLACES.map((p) => <Tag key={p.value} active={placeCategory === p.value} onClick={() => setPlaceCategory(p.value)}>{p.label}</Tag>)}
                </div>
                <div className="mt-3">
                  <Field label="Place label - optional" placeholder="Main library quiet floor" value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} />
                </div>
              </div>
              {s.spatialTrace && (
                <div>
                  <Label className="mb-2">Did SAIL read your movement correctly?</Label>
                  <div className="flex flex-wrap gap-2">
                    {MOBILITY.map((m) => <Tag key={m.value} active={mobilityState === m.value} onClick={() => setMobilityState(m.value)}>{m.label}</Tag>)}
                  </div>
                  <p className="label-mono mt-2 normal-case tracking-normal" style={{ letterSpacing: 0 }}>
                    Recorded as {s.spatialTrace.acquisitionMode} · {s.spatialTrace.sources.join(', ') || 'no sensor'} · raw GPS not stored.
                  </p>
                </div>
              )}
              <div>
                <Label className="mb-2">How much did this context help?</Label>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as Rating[]).map((n) => (
                    <button key={n} onClick={() => setContextHelpfulness(n)}
                      className={`h-11 flex-1 rounded-md border text-sm transition-colors ${contextHelpfulness === n ? 'border-ink bg-ink font-semibold text-canvas' : 'border-black/20 text-ink/55'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <TextArea label="Context reflection - did this place support your strategy?" rows={2} value={contextReflection} onChange={(e) => setContextReflection(e.target.value)} />
            </>
          )}
          <TextArea label="Correct SAIL's learner model - optional" rows={2} placeholder="e.g. I was not avoiding help; I was trying to solve it independently." value={learnerModelCorrection} onChange={(e) => setLearnerModelCorrection(e.target.value)} />
          <TextArea label={metacog ? 'Feed-forward — next time I will…' : 'For next time'} rows={2} placeholder={metacog ? 'e.g. retrieval practice after 15 min instead of re-reading' : ''} value={adjustment} onChange={(e) => setAdjustment(e.target.value)} />
        </div>

        <Rule className="mt-8" />
        <div className="mt-6"><AccentButton onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save reflection ✓'}</AccentButton></div>
      </div>
    </Screen>
  );
}
