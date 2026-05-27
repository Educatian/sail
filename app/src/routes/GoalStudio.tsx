import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Screen, TopBar, Label, Field, TextArea, PillGroup, Tag, Slider, AccentButton, GhostButton, Rule } from '../components/editorial';
import { LocationMap } from '../components/LocationMap';
import { Reveal } from '../components/ui';
import { api, type LearnerModel } from '../lib/api';
import { STRATEGY_LABELS, TASK_LABELS } from '../domain';
import type { Condition, PlaceCategory, SpatialSource, SpatialTrace, StrategyKind, ScaffoldStyle, ScaffoldTiming, TaskKind } from '../domain';

const ALL_STRATEGIES = Object.keys(STRATEGY_LABELS) as StrategyKind[];
const ALL_TASKS = Object.keys(TASK_LABELS) as TaskKind[];
const PLACES: { value: PlaceCategory; label: string }[] = [
  { value: 'stable_study', label: 'Library / stable study place' },
  { value: 'classroom', label: 'Classroom / lab' },
  { value: 'home_like', label: 'Home / dorm' },
  { value: 'transit', label: 'Transit / between places' },
  { value: 'work_social', label: 'Work / social space' },
  { value: 'other', label: 'Other' },
  { value: 'not_shared', label: 'Do not record' },
];

const coarseCoord = (n: number) => Math.round(n * 1000) / 1000;

async function sampleMotion(): Promise<{ source?: SpatialSource; magnitude: number | null; permissionState?: SpatialTrace['permissionState'] }> {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return { magnitude: null, permissionState: 'unsupported' };
  const motionCtor = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
  if (typeof motionCtor.requestPermission === 'function') {
    const permission = await motionCtor.requestPermission().catch(() => 'denied' as const);
    if (permission !== 'granted') return { magnitude: null, permissionState: 'denied' };
  }
  return new Promise((resolve) => {
    let max = 0;
    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity ?? event.acceleration;
      const x = a?.x ?? 0;
      const y = a?.y ?? 0;
      const z = a?.z ?? 0;
      max = Math.max(max, Math.sqrt(x * x + y * y + z * z));
    };
    window.addEventListener('devicemotion', onMotion);
    window.setTimeout(() => {
      window.removeEventListener('devicemotion', onMotion);
      resolve({ source: max > 0 ? 'device_motion' : undefined, magnitude: max > 0 ? Math.round(max * 100) / 100 : null, permissionState: 'granted' });
    }, 900);
  });
}

export function GoalStudio() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [taskKind, setTaskKind] = useState<TaskKind>('coursework');
  const [condition, setCondition] = useState<Condition>('metacog');
  const [goals, setGoals] = useState<string[]>(['']);
  const [strategies, setStrategies] = useState<StrategyKind[]>([]);
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [material, setMaterial] = useState('');                // optional course material (RAG grounding)
  const [confidence, setConfidence] = useState(50);            // JOL prediction 0-100 (RQ1)
  const [style, setStyle] = useState<ScaffoldStyle>('problematizing'); // RQ11
  const [timing, setTiming] = useState<ScaffoldTiming>('responsive');  // RQ9
  const [placeCategory, setPlaceCategory] = useState<PlaceCategory>('not_shared');
  const [placeLabel, setPlaceLabel] = useState('');
  const [intentionallyChosen, setIntentionallyChosen] = useState(false);
  const [spatialTrace, setSpatialTrace] = useState<SpatialTrace | undefined>();
  const [spatialBusy, setSpatialBusy] = useState(false);
  const [spatialStatus, setSpatialStatus] = useState('Auto-detect is off.');
  const [spatialConsentOpen, setSpatialConsentOpen] = useState(false);
  const [spatialConsentAccepted, setSpatialConsentAccepted] = useState(false);
  const [detectedMapPoint, setDetectedMapPoint] = useState<{ lat: number; lng: number; accuracy?: number } | undefined>();
  const [busy, setBusy] = useState(false);
  const [carry, setCarry] = useState<LearnerModel['carry']>(null);
  const mapLoggedRef = useRef(false);
  const forethoughtSnapshotRef = useRef('');

  // close the SRL loop: pull last session's adjustment, unmet goals, and what worked
  useEffect(() => {
    api.getLearner().then((lm) => {
      if (!lm.carry) return;
      setCarry(lm.carry);
      if (lm.carry.unmetGoals.length) setGoals([...lm.carry.unmetGoals, '']);
      if (lm.carry.suggestedStrategies.length) setStrategies(lm.carry.suggestedStrategies);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!detectedMapPoint || mapLoggedRef.current) return;
    mapLoggedRef.current = true;
    void api.track('map_rendered', {
      surface: 'goal_studio',
      provider: 'openstreetmap',
      accuracyMeters: detectedMapPoint.accuracy,
      rawLocationStored: false,
    });
  }, [detectedMapPoint]);

  useEffect(() => {
    const payload = {
      action: 'plan_state_changed',
      taskKind,
      goalsCount: goals.map((g) => g.trim()).filter(Boolean).length,
      strategiesCount: strategies.length,
      plannedMinutes,
      confidencePre: confidence,
      scaffoldStyle: style,
      scaffoldTiming: timing,
      placeCategory,
      hasPlaceLabel: placeLabel.trim().length > 0,
      intentionallyChosen,
      spatialMode: spatialTrace?.acquisitionMode ?? 'off',
    };
    const key = JSON.stringify(payload);
    if (forethoughtSnapshotRef.current === key) return;
    const timer = window.setTimeout(() => {
      forethoughtSnapshotRef.current = key;
      void api.track('forethought_changed', payload, undefined, condition);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [condition, confidence, goals, intentionallyChosen, placeCategory, placeLabel, plannedMinutes, spatialTrace?.acquisitionMode, strategies.length, style, taskKind, timing]);

  const toggle = (k: StrategyKind) => setStrategies((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  async function detectSpatialContext(forceConsent = false) {
    if (!forceConsent && !spatialConsentAccepted) {
      setSpatialConsentOpen(true);
      void api.track('spatial_consent_opened', { surface: 'goal_studio' });
      return;
    }
    setSpatialBusy(true);
    setSpatialStatus('Asking this device for location and motion permission...');
    void api.track('spatial_detection_started', { surface: 'goal_studio' });
    const sources: SpatialSource[] = [];
    let permissionState: SpatialTrace['permissionState'] = 'unsupported';
    let coords: GeolocationCoordinates | undefined;
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
        });
        coords = pos.coords;
        setDetectedMapPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: typeof pos.coords.accuracy === 'number' ? Math.round(pos.coords.accuracy) : undefined,
        });
        sources.push('gps');
        permissionState = 'granted';
      } catch (err) {
        permissionState = (err as GeolocationPositionError)?.code === 1 ? 'denied' : 'error';
      }
    }
    const motion = await sampleMotion().catch(() => ({ source: undefined, magnitude: null, permissionState: 'error' as const }));
    if (motion.source) sources.push(motion.source);
    if (permissionState !== 'granted' && motion.permissionState) permissionState = motion.permissionState;
    const speed = typeof coords?.speed === 'number' ? coords.speed : null;
    const mobilityState = speed != null ? (speed > 1 ? 'moving' : 'still') : motion.magnitude != null ? (motion.magnitude > 12 ? 'moving' : 'still') : 'unknown';
    const trace: SpatialTrace = {
      acquisitionMode: sources.length ? 'auto' : 'off',
      capturedAt: new Date().toISOString(),
      sources,
      permissionState,
      coarseLatitude: typeof coords?.latitude === 'number' ? coarseCoord(coords.latitude) : undefined,
      coarseLongitude: typeof coords?.longitude === 'number' ? coarseCoord(coords.longitude) : undefined,
      accuracyMeters: typeof coords?.accuracy === 'number' ? Math.round(coords.accuracy) : undefined,
      speedMetersPerSecond: speed,
      motionMagnitude: motion.magnitude,
      mobilityState,
      rawLocationStored: false,
    };
    setSpatialTrace(trace);
    void api.track(sources.length ? 'spatial_detection_completed' : 'spatial_detection_failed', {
      permissionState,
      sources,
      mobilityState,
      accuracyMeters: trace.accuracyMeters,
      hasMapPoint: !!coords,
      rawLocationStored: false,
    });
    if (sources.length && placeCategory === 'not_shared') {
      setPlaceCategory(mobilityState === 'moving' ? 'transit' : 'other');
      setPlaceLabel(mobilityState === 'moving' ? 'Auto-detected movement' : 'Auto-detected study area');
      setIntentionallyChosen(false);
    }
    setSpatialStatus(sources.length
      ? `Captured ${sources.join(' + ')} - ${mobilityState} - map point visible now`
      : 'No sensor data captured. You can still choose the context manually.');
    setSpatialBusy(false);
  }

  async function start() {
    setBusy(true);
    try {
      const s = await api.createSession({
        subject: subject.trim() || 'Untitled',
        taskKind,
        condition,
        scaffoldStyle: style,
        scaffoldTiming: timing,
        goals: goals.map((g) => g.trim()).filter(Boolean),
        strategies,
        plannedMinutes,
        confidencePre: confidence,
        contextTrace: {
          placeCategory,
          placeLabel: placeLabel.trim() || undefined,
          intentionallyChosen,
          rawLocationStored: false,
        },
        spatialTrace: spatialTrace ?? {
          acquisitionMode: placeCategory === 'not_shared' ? 'off' : 'manual',
          sources: placeCategory === 'not_shared' ? [] : ['manual'],
          mobilityState: 'unknown',
          rawLocationStored: false,
        },
      });
      void api.track('forethought_changed', {
        action: 'session_submitted',
        taskKind,
        goalsCount: goals.map((g) => g.trim()).filter(Boolean).length,
        strategies,
        plannedMinutes,
        confidencePre: confidence,
        scaffoldStyle: style,
        scaffoldTiming: timing,
        placeCategory,
        spatialMode: spatialTrace?.acquisitionMode ?? 'off',
      }, s.id, s.condition);
      if (material.trim()) await api.putMaterials(s.subject, material).catch(() => {});
      navigate({ to: '/study/active/$id', params: { id: s.id } });
    } finally { setBusy(false); }
  }

  return (
    <Screen>
      <TopBar section="01" title="New session" left={<button onClick={() => navigate({ to: '/' })} className="mr-1 text-lg text-ink/50">←</button>} />

      <div className="space-y-8 px-5 pt-7">
        {carry && (carry.lastAdjustment || carry.unmetGoals.length > 0) && (
          <Reveal>
            <div className="border-l-2 border-accent pl-4">
              <Label className="accent">Continuing the loop</Label>
              {carry.lastAdjustment && <p className="mt-1.5 text-sm">Last time you planned: <span className="font-medium">“{carry.lastAdjustment}”</span></p>}
              {carry.unmetGoals.length > 0 && <p className="mt-1 text-sm text-ink/55">Carried {carry.unmetGoals.length} unfinished goal{carry.unmetGoals.length > 1 ? 's' : ''} + your strategy that worked.</p>}
            </div>
          </Reveal>
        )}
        <Reveal><Field label="Subject - course, seminar, thesis, or exam" placeholder="EDU 612 seminar reading" value={subject} onChange={(e) => setSubject(e.target.value)} /></Reveal>

        <Reveal delay={0.025}>
          <Label className="mb-3">University work type</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_TASKS.map((k) => <Tag key={k} active={taskKind === k} onClick={() => setTaskKind(k)}>{TASK_LABELS[k]}</Tag>)}
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <Label className="mb-3">Goals</Label>
          <div className="space-y-3">
            {goals.map((g, i) => (
              <Field key={i} label={`Goal ${String(i + 1).padStart(2, '0')}`} placeholder="…" value={g} onChange={(e) => setGoals((arr) => arr.map((x, k) => (k === i ? e.target.value : x)))} />
            ))}
          </div>
          <button onClick={() => setGoals((g) => [...g, ''])} className="label-mono mt-3 accent">+ Add goal</button>
        </Reveal>

        <Reveal delay={0.1}>
          <Label className="mb-3">Strategy plan</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_STRATEGIES.map((k) => <Tag key={k} active={strategies.includes(k)} onClick={() => toggle(k)}>{STRATEGY_LABELS[k]}</Tag>)}
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <Field label="Planned minutes" type="number" value={String(plannedMinutes)} onChange={(e) => setPlannedMinutes(Number(e.target.value) || 0)} />
        </Reveal>

        <Reveal delay={0.16}>
          <Slider label="Confidence you'll meet these goals (JOL)" value={confidence} onChange={setConfidence} suffix="%" />
        </Reveal>

        <Reveal delay={0.165}>
          <Label className="mb-3">Learning context <span className="opacity-50">· no raw GPS stored</span></Label>
          <div className="flex flex-wrap gap-2">
            {PLACES.map((p) => <Tag key={p.value} active={placeCategory === p.value} onClick={() => setPlaceCategory(p.value)}>{p.label}</Tag>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Optional place label" placeholder="Main library quiet floor" value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} />
            <label className="flex items-end gap-2 pb-3 text-sm text-ink/60">
              <input type="checkbox" checked={intentionallyChosen} onChange={(e) => setIntentionallyChosen(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              chosen on purpose
            </label>
          </div>
        </Reveal>

        <Reveal delay={0.168}>
          <Label className="mb-3">Use this device to detect context</Label>
          <div className="rounded-md border border-black/12 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <AccentButton onClick={() => void detectSpatialContext()} disabled={spatialBusy}>{spatialBusy ? 'Detecting...' : spatialConsentAccepted ? 'Detect location + motion' : 'Review privacy + detect'}</AccentButton>
              <span className="text-xs text-ink/55">{spatialStatus}</span>
            </div>
            {spatialConsentOpen && !spatialConsentAccepted && (
              <div className="mt-3 rounded border border-accent/30 bg-accent/5 p-3 text-sm">
                <div className="font-display font-medium">Before SAIL asks this device</div>
                <div className="mt-2 space-y-1 text-ink/60">
                  <p>Used for: noticing whether place or movement may relate to your study session.</p>
                  <p>Stored: rounded area, accuracy, motion signal, and still/moving estimate.</p>
                  <p>Not stored: exact raw GPS coordinates or background tracking.</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setSpatialConsentAccepted(true); setSpatialConsentOpen(false); void api.track('spatial_consent_accepted', { surface: 'goal_studio' }); void detectSpatialContext(true); }}
                    className="rounded-md bg-ink px-3 py-2 text-xs uppercase tracking-wide text-canvas"
                  >
                    I understand, detect
                  </button>
                  <button onClick={() => { setSpatialConsentOpen(false); void api.track('spatial_consent_declined', { surface: 'goal_studio' }); }} className="rounded-md border border-black/15 px-3 py-2 text-xs uppercase tracking-wide text-ink/60">Not now</button>
                </div>
              </div>
            )}
            {spatialTrace && (
              <div className="label-mono mt-3 normal-case tracking-normal" style={{ letterSpacing: 0 }}>
                Mode {spatialTrace.acquisitionMode} · sources {spatialTrace.sources.length ? spatialTrace.sources.join(', ') : 'none'} · mobility {spatialTrace.mobilityState}
                {spatialTrace.accuracyMeters ? ` · accuracy ~${spatialTrace.accuracyMeters}m` : ''}
              </div>
            )}
            {(detectedMapPoint || spatialTrace?.coarseLatitude) && (
              <div className="mt-3">
                <LocationMap
                  center={detectedMapPoint ?? (
                    spatialTrace?.coarseLatitude && spatialTrace.coarseLongitude
                      ? { lat: spatialTrace.coarseLatitude, lng: spatialTrace.coarseLongitude, accuracy: spatialTrace.accuracyMeters }
                      : undefined
                  )}
                  label="Detected study location on a map"
                />
                <p className="mt-2 text-xs text-ink/45">
                  The visible marker uses this device's current point in this screen. The saved session keeps only the rounded area.
                </p>
              </div>
            )}
            <p className="mt-2 text-xs text-ink/45">SAIL stores rounded area and movement signals for research export; exact raw coordinates are not stored.</p>
          </div>
        </Reveal>

        <Reveal delay={0.17}>
          <TextArea label="Study material — optional, grounds Marin" rows={3} placeholder="Paste notes / a textbook section. Marin will coach from this and admit when something isn't in it." value={material} onChange={(e) => setMaterial(e.target.value)} />
        </Reveal>

        <Reveal delay={0.18}>
          <Label className="mb-3">How should Marin coach you?</Label>
          <PillGroup value={condition} onChange={setCondition} options={[{ value: 'metacog', label: 'Coach my process' }, { value: 'plain', label: 'Just help with content' }]} />
          <p className="label-mono mt-3 normal-case tracking-normal" style={{ letterSpacing: 0 }}>
            {condition === 'metacog' ? 'Marin will ask about your plan, progress, and next move.' : 'Marin will keep the conversation closer to the study material.'}
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <Label className="mb-3">What kind of help feels right?</Label>
          <PillGroup value={style} onChange={setStyle} options={[{ value: 'problematizing', label: 'Make me think it through' }, { value: 'structuring', label: 'Give me more structure' }]} />
          <Label className="mb-3 mt-5">When should Marin step in?</Label>
          <PillGroup value={timing} onChange={setTiming} options={[{ value: 'responsive', label: 'Only when I ask or get stuck' }, { value: 'proactive', label: 'Check in at the start' }]} />
        </Reveal>

        <Rule />
        <Reveal delay={0.22}><AccentButton onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start session →'}</AccentButton></Reveal>
        <GhostButton onClick={() => navigate({ to: '/' })}>Cancel</GhostButton>
      </div>
    </Screen>
  );
}
