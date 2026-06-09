import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Screen, TopBar, Label, Stat, Rule, Row, AccentButton } from '../components/editorial';
import { CountUp, Reveal } from '../components/ui';
import { api, isInstructor, type LearnerModel, type Stats } from '../lib/api';
import { STRATEGY_LABELS, TASK_LABELS, type StrategyKind, type TaskKind } from '../domain';

function Bar({ label, value, max, accent = false }: { label: string; value: number; max: number; accent?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <div className="w-36 shrink-0 truncate text-ink/60">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/8">
        <div className={`h-full rounded-full ${accent ? 'bg-accent' : 'bg-ink'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="num w-6 text-right text-base">{value}</div>
    </div>
  );
}

const tokenLabel = (value: string) => value.replace(/_/g, ' ');
const taskLabel = (value: string) => TASK_LABELS[value as TaskKind] ?? tokenLabel(value);
const placeLabel = (value: string) => ({
  stable_study: 'Library / study spot',
  classroom: 'Classroom / lab',
  home_like: 'Home / dorm',
  transit: 'On the move',
  work_social: 'Work / social space',
  other: 'Other place',
  not_shared: 'Not shared',
}[value] ?? tokenLabel(value));

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [learner, setLearner] = useState<LearnerModel | null>(null);
  useEffect(() => {
    api.getStats().then(setStats).catch(() => setStats(null));
    api.getLearner().then(setLearner).catch(() => {});
  }, []);

  if (!stats) return <Screen><div className="px-5 py-10"><Label>Loading...</Label></div></Screen>;
  const { totals, byStrategy, hintLevels, timeline } = stats;

  if (totals.sessions === 0) {
    return (
      <Screen>
        <TopBar section="04" title="Progress" />
        <div className="px-5 py-12">
          <div className="num text-5xl text-black/15">NO DATA</div>
          <p className="mt-3 text-sm text-ink/55">Run a session to see your study patterns.</p>
          <div className="mt-6"><AccentButton onClick={() => navigate({ to: '/study/new' })}>+ New session</AccentButton></div>
        </div>
      </Screen>
    );
  }

  const stratEntries = Object.entries(byStrategy).sort((a, b) => b[1] - a[1]);
  const taskEntries = Object.entries(stats.taskCounts).sort((a, b) => b[1] - a[1]);
  const contextEntries = Object.entries(stats.contextCounts).sort((a, b) => b[1] - a[1]);
  const hintMax = Math.max(1, ...Object.values(hintLevels));
  const stratMax = Math.max(1, ...Object.values(byStrategy));
  const taskMax = Math.max(1, ...Object.values(stats.taskCounts));
  const contextMax = Math.max(1, ...Object.values(stats.contextCounts));
  const spatialOn = (stats.spatialCounts.auto ?? 0) + (stats.spatialCounts.manual ?? 0);

  return (
    <Screen>
      <TopBar
        section="04"
        title="Progress"
        right={isInstructor() ? <button onClick={() => navigate({ to: '/research' })} className="label-mono accent">Research view</button> : undefined}
      />

      <div className="px-5 pt-7">
        <Reveal><Stat size="hero" value={<CountUp value={totals.minutes} suffix="m" />} caption="Time spent studying" /></Reveal>
        <Reveal delay={0.08}>
          <div className="mt-7 grid grid-cols-3 divide-x divide-black/12">
            <div className="pr-3"><Stat size="sm" value={<CountUp value={totals.sessions} />} caption="Sessions" /></div>
            <div className="px-3"><Stat size="sm" value={<CountUp value={totals.goalCompletionRate} suffix="%" />} caption="Goals met" /></div>
            <div className="pl-3"><Stat size="sm" value={`${totals.avgFocus ?? '-'}/${totals.avgProgress ?? '-'}`} caption="Focus / progress" /></div>
          </div>
        </Reveal>
      </div>

      {learner && learner.strategyEfficacy.length > 0 && (
        <>
          <div className="mt-9 px-5"><Label>/ What seems to work for you</Label></div>
          <Rule className="mt-3" />
          <div className="space-y-1.5 px-5 py-3">
            {learner.strategyEfficacy.slice(0, 4).map((e, i) => (
              <div key={e.kind} className="flex items-center justify-between text-sm">
                <span className="text-ink/70">{STRATEGY_LABELS[e.kind]}</span>
                <span className={`num text-base ${i === 0 ? 'accent' : ''}`}>{e.avgProgress}<span className="text-xs text-ink/40">/5</span></span>
              </div>
            ))}
            <p className="label-mono mt-2 normal-case tracking-normal" style={{ letterSpacing: 0 }}>Based on your own progress ratings after sessions.</p>
          </div>
        </>
      )}

      {learner && learner.contextPatterns.length > 0 && (
        <>
          <div className="mt-5 px-5"><Label>/ Places that seem to support study</Label></div>
          <Rule className="mt-3" />
          <div className="space-y-1.5 px-5 py-3">
            {learner.contextPatterns.slice(0, 4).map((p, i) => (
              <div key={p.placeCategory} className="flex items-center justify-between text-sm">
                <span className="text-ink/70">{placeLabel(p.placeCategory)}</span>
                <span className={`num text-base ${i === 0 ? 'accent' : ''}`}>{p.avgProgress}<span className="text-xs text-ink/40">/5</span> <span className="text-xs text-ink/35">n={p.n}</span></span>
              </div>
            ))}
            <p className="label-mono mt-2 normal-case tracking-normal" style={{ letterSpacing: 0 }}>Use this as a planning hint, not a fixed rule.</p>
          </div>
        </>
      )}

      <div className="mt-5 px-5"><Label>/ How you use Marin</Label></div>
      <Rule className="mt-3" />
      <div className="px-5 py-3">
        <Bar label="Small nudges" value={hintLevels['1'] ?? 0} max={hintMax} />
        <Bar label="Concrete clues" value={hintLevels['2'] ?? 0} max={hintMax} />
        <Bar label="Worked steps" value={hintLevels['3'] ?? 0} max={hintMax} accent />
        {learner && (
          <p className="label-mono mt-2 normal-case tracking-normal" style={{ letterSpacing: 0 }}>
            {learner.hintTrend.decreasing ? 'You are asking for less detailed help over time.' : `Current support level: ${learner.scaffold.level}.`}
          </p>
        )}
      </div>

      {stratEntries.length > 0 && (
        <>
          <div className="mt-5 px-5"><Label>/ Strategies you choose most</Label></div>
          <Rule className="mt-3" />
          <div className="px-5 py-3">
            {stratEntries.map(([k, v], i) => <Bar key={k} label={STRATEGY_LABELS[k as StrategyKind] ?? k} value={v} max={stratMax} accent={i === 0} />)}
          </div>
        </>
      )}

      {taskEntries.length > 0 && (
        <>
          <div className="mt-5 px-5"><Label>/ Your study mix</Label></div>
          <Rule className="mt-3" />
          <div className="px-5 py-3">
            {taskEntries.map(([k, v], i) => <Bar key={k} label={taskLabel(k)} value={v} max={taskMax} accent={i === 0} />)}
          </div>
        </>
      )}

      {contextEntries.length > 0 && (
        <>
          <div className="mt-5 px-5"><Label>/ Context you shared</Label></div>
          <Rule className="mt-3" />
          <div className="px-5 py-3">
            {contextEntries.map(([k, v], i) => <Bar key={k} label={placeLabel(k)} value={v} max={contextMax} accent={k !== 'not_shared' && i === 0} />)}
            <p className="label-mono mt-2 normal-case tracking-normal" style={{ letterSpacing: 0 }}>
              Spatial detection used in {spatialOn} session{spatialOn === 1 ? '' : 's'}.
            </p>
          </div>
        </>
      )}

      <div className="mt-5 px-5"><Label>/ Recent sessions</Label></div>
      <Rule className="mt-3" />
      {timeline.map((t) => (
        <Row key={t.id} onClick={() => navigate({ to: t.completed ? '/study/reflect/$id' : '/study/active/$id', params: { id: t.id } })}>
          <div className="flex-1">
            <div className="font-display font-medium">{t.subject}</div>
            <div className="label-mono mt-1">{t.date} · {taskLabel(t.taskKind)} · {t.minutes}M · {t.goalsDone}/{t.goalsTotal} GOALS</div>
          </div>
          <span className="label-mono">{t.focus ?? '-'}·{t.progress ?? '-'}·{t.satisfaction ?? '-'}</span>
        </Row>
      ))}
    </Screen>
  );
}
