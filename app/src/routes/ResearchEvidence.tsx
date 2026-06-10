import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Screen, TopBar, Label, Rule, Row } from '../components/editorial';
import { api, apiUrl, studentQuery, isInstructor, type LearnerModel, type Stats } from '../lib/api';
import { TASK_LABELS, type TaskKind } from '../domain';

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

export function ResearchEvidence() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [learner, setLearner] = useState<LearnerModel | null>(null);
  // Route guard: research/telemetry view is instructor-only even via a direct URL.
  useEffect(() => {
    if (!isInstructor()) { navigate({ to: '/dashboard' }); return; }
    api.getStats().then(setStats).catch(() => setStats(null));
    api.getLearner().then(setLearner).catch(() => {});
  }, [navigate]);

  if (!isInstructor()) return <Screen><div className="px-5 py-10"><Label>Loading...</Label></div></Screen>;
  if (!stats) return <Screen><div className="px-5 py-10"><Label>Loading...</Label></div></Screen>;

  const sections: { title: string; data: Record<string, number>; note: string; accentKey?: string; label?: (k: string) => string }[] = [
    { title: 'Telemetry event stream', data: stats.eventCounts, note: 'All research telemetry events written to the event table, including client interaction, timer, mentor, and spatial/map events.' },
    { title: 'Policy actions', data: stats.policyCounts, note: 'Whether Marin abstained, prompted monitoring/control/reflection, faded, or escalated.' },
    { title: 'Detected learner states', data: stats.stateCounts, note: 'Text-only learner-state proxy from mentor tags.' },
    { title: 'Help-seeking quality', data: stats.helpSeekingCounts, note: 'Rule proxy: instrumental, executive, avoidance, or none.', accentKey: 'instrumental' },
    { title: 'Scaffold fidelity', data: stats.fidelityCounts, note: 'Automated first-pass check of selected policy action vs mentor label.', accentKey: 'aligned' },
    { title: 'Context traces', data: stats.contextCounts, note: 'Learner-controlled place category distribution.' },
    { title: 'Spatial acquisition', data: stats.spatialCounts, note: 'Opt-in browser GPS/device-motion acquisition mode. Raw coordinates are not stored.', accentKey: 'auto' },
    { title: 'University work type', data: stats.taskCounts, note: 'Task mix for college/graduate workflows.', label: taskLabel },
  ];

  return (
    <Screen>
      <TopBar
        section="R"
        title="Research Evidence"
        left={<button onClick={() => navigate({ to: '/dashboard' })} className="mr-1 text-lg text-ink/50">←</button>}
        right={<a href={apiUrl('/api/export' + studentQuery())} className="label-mono accent">Export JSON</a>}
      />

      <div className="px-5 pt-6">
        <p className="text-sm text-ink/60">Implementation evidence for the KPIDT prototype. This view keeps research terms out of the student-facing progress screen.</p>
      </div>

      <div className="mt-6 px-5">
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <Label className="text-amber-900">/ Method status</Label>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-amber-900">
            <p>Help-seeking quality, learner state, and scaffold fidelity are automated rule proxies. Use them for instrumentation checks, not final research claims.</p>
            <p>Spatial traces are coarse context signals. They should be interpreted with task type, performance, and reflection, not as exact location evidence.</p>
            <p>Before reporting effects, validate a sample against human-coded dialogue and context rubrics.</p>
          </div>
        </div>
      </div>

      {sections.map((s) => {
        const entries = Object.entries(s.data).sort((a, b) => b[1] - a[1]);
        if (!entries.length) return null;
        const max = Math.max(1, ...Object.values(s.data));
        return (
          <div key={s.title} className="mt-6">
            <div className="px-5"><Label>/ {s.title}</Label></div>
            <Rule className="mt-3" />
            <div className="px-5 py-3">
              {entries.map(([k, v], i) => <Bar key={k} label={s.label ? s.label(k) : tokenLabel(k)} value={v} max={max} accent={k === s.accentKey || (!s.accentKey && i === 0)} />)}
              <p className="label-mono mt-2 normal-case tracking-normal" style={{ letterSpacing: 0 }}>{s.note}</p>
            </div>
          </div>
        );
      })}

      {learner && (learner.contextPatterns.length > 0 || learner.taskMix.length > 0 || learner.recentCorrections.length > 0) && (
        <div className="mt-6">
          <div className="px-5"><Label>/ Open learner model evidence</Label></div>
          <Rule className="mt-3" />
          <div className="space-y-3 px-5 py-3 text-sm">
            {learner.contextPatterns.slice(0, 4).map((p) => (
              <div key={p.placeCategory} className="flex items-center justify-between">
                <span className="text-ink/65">{tokenLabel(p.placeCategory)}</span>
                <span className="num text-base">{p.avgProgress}<span className="text-xs text-ink/40">/5</span> <span className="text-xs text-ink/35">n={p.n}</span></span>
              </div>
            ))}
            {learner.taskMix.slice(0, 4).map((p) => (
              <div key={p.taskKind} className="flex items-center justify-between">
                <span className="text-ink/65">{taskLabel(p.taskKind)}</span>
                <span className="num text-base">{p.n}</span>
              </div>
            ))}
            {learner.recentCorrections.length > 0 && <p className="label-mono normal-case tracking-normal" style={{ letterSpacing: 0 }}>Latest learner correction: {learner.recentCorrections[0]}</p>}
          </div>
        </div>
      )}

      <div className="mt-6 px-5"><Label>/ Session timeline</Label></div>
      <Rule className="mt-3" />
      {stats.timeline.map((t) => (
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
