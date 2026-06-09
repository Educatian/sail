import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Screen, TopBar, Label, AccentButton, GhostButton, Rule } from '../components/editorial';
import { LocationMap } from '../components/LocationMap';
import { MarinChat } from '../components/MarinChat';
import { parseMentor, labelBadge } from '../lib/mentor';
import { api, streamChat, isInstructor } from '../lib/api';

// lazy: keeps react-markdown + KaTeX out of the initial bundle
const MentorText = lazy(() => import('../components/MentorText').then((m) => ({ default: m.MentorText })));
import { TASK_LABELS, type StudySession, type ChatMessage, type TimerSegment, type TaskKind, type Rating, type ContextFit, type RegulationAction, type MomentaryTrigger, type MomentaryCheck } from '../domain';

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function elapsedMs(segs: TimerSegment[]) {
  return segs.reduce((sum, s) => sum + ((s.endTime ? new Date(s.endTime).getTime() : Date.now()) - new Date(s.startTime).getTime()), 0);
}

const taskLabel = (value: string) => TASK_LABELS[value as TaskKind] ?? value.replace(/_/g, ' ');
let localMessageId = 0;
const nextLocalMessageId = (prefix: 'u' | 'a') => `${prefix}${++localMessageId}`;

interface TrackPoint {
  lat: number;
  lng: number;
  at: number;
  accuracy?: number;
  speed?: number | null;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
function metersBetween(a: TrackPoint, b: TrackPoint) {
  const r = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function gpsNoiseFloor(a: TrackPoint, b: TrackPoint) {
  const acc = ((a.accuracy ?? 12) + (b.accuracy ?? 12)) / 2;
  return Math.max(8, Math.min(60, acc));
}

function effectiveMetersBetween(a: TrackPoint, b: TrackPoint) {
  return Math.max(0, metersBetween(a, b) - gpsNoiseFloor(a, b));
}

function totalDistance(points: TrackPoint[]) {
  return points.slice(1).reduce((sum, p, i) => sum + effectiveMetersBetween(points[i], p), 0);
}

function routePreview(points: TrackPoint[]) {
  if (points.length === 0) return [];
  if (totalDistance(points) < 5) return [{ x: 50, y: 50 }];
  const step = Math.max(1, Math.ceil(points.length / 40));
  const sampled = points.filter((_, i) => i % step === 0).slice(-40);
  const lats = sampled.map((p) => p.lat);
  const lngs = sampled.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  return sampled.map((p) => ({
    x: lngSpan ? 6 + ((p.lng - minLng) / lngSpan) * 88 : 50,
    y: latSpan ? 94 - ((p.lat - minLat) / latSpan) * 88 : 50,
  }));
}

function movementStats(points: TrackPoint[]) {
  let dwellSeconds = 0;
  let transitionCount = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const distance = effectiveMetersBetween(prev, curr);
    const seconds = Math.max(0, (curr.at - prev.at) / 1000);
    if (distance < 12) dwellSeconds += seconds;
    if (distance > 50) transitionCount += 1;
  }
  return { dwellSeconds, transitionCount };
}

function liveSpatialTrace(points: TrackPoint[], startedAt: string, ended: boolean, forceStationary = false): StudySession['spatialTrace'] {
  const last = points.at(-1);
  const prev = points.at(-2);
  const now = new Date().toISOString();
  const distanceMeters = forceStationary ? 0 : totalDistance(points);
  const inferredSpeed = last && prev && last.at > prev.at ? effectiveMetersBetween(prev, last) / ((last.at - prev.at) / 1000) : undefined;
  const speed = forceStationary ? 0 : (typeof last?.speed === 'number' && Number.isFinite(last.speed) ? last.speed : inferredSpeed);
  const { dwellSeconds, transitionCount } = movementStats(points);
  const isCoarseIndoor = (last?.accuracy ?? 0) > 45;
  const isMoving = isCoarseIndoor ? distanceMeters > 120 || (speed ?? 0) > 2 : distanceMeters > 25 || (speed ?? 0) > 0.6;
  const preview = forceStationary ? [{ x: 50, y: 50 }] : routePreview(points);
  return {
    acquisitionMode: 'auto',
    capturedAt: now,
    sources: ['gps'],
    permissionState: 'granted',
    coarseLatitude: last ? Math.round(last.lat * 1000) / 1000 : undefined,
    coarseLongitude: last ? Math.round(last.lng * 1000) / 1000 : undefined,
    accuracyMeters: last?.accuracy,
    speedMetersPerSecond: typeof speed === 'number' && Number.isFinite(speed) ? Math.round(speed * 100) / 100 : null,
    motionMagnitude: null,
    mobilityState: forceStationary ? 'still' : (points.length < 2 ? 'unknown' : (isMoving ? 'moving' : 'still')),
    trackingState: ended ? 'ended' : 'live',
    trackingMode: forceStationary ? 'study_spot' : 'route',
    trackingStartedAt: startedAt,
    trackingEndedAt: ended ? now : undefined,
    lastSampleAt: last ? new Date(last.at).toISOString() : undefined,
    sampleCount: points.length,
    distanceMeters: Math.round(distanceMeters * 100) / 100,
    dwellSeconds: Math.round(dwellSeconds),
    transitionCount: forceStationary ? 0 : transitionCount,
    routePreview: preview,
    rawLocationStored: false,
  };
}

export function ActiveSession() {
  const { id } = useParams({ from: '/study/active/$id' });
  const navigate = useNavigate();
  const [session, setSession] = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [, force] = useState(0);
  const chatEnd = useRef<HTMLDivElement>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const [trackingLive, setTrackingLive] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [trackingMode, setTrackingMode] = useState<'spot' | 'route'>('spot');
  const trackingWatchRef = useRef<number | null>(null);
  const trackingStartedRef = useRef<string | null>(null);
  const trackPointsRef = useRef<TrackPoint[]>([]);
  const [liveMapPoints, setLiveMapPoints] = useState<TrackPoint[]>([]);
  const trackingModeRef = useRef<'spot' | 'route'>('spot');
  const trackingSampleLoggedRef = useRef(0);
  const mapLoggedRef = useRef(false);
  // T1 momentary check (event-contingent EMA at organic touchpoints)
  const lastCheckAtRef = useRef(0);
  const checkCountRef = useRef(0);
  const hiddenSinceRef = useRef<number | null>(null);
  const [momentaryDue, setMomentaryDue] = useState<MomentaryTrigger | null>(null);
  const [mFocus, setMFocus] = useState<Rating | null>(null);
  const [mFit, setMFit] = useState<ContextFit | null>(null);
  const [stretchOpen, setStretchOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  function toggleMic() {
    if (!SR) return;
    if (listening) { void api.track('voice_input_stopped', { surface: 'active_session' }, id, session?.condition); recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false;
    rec.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => setInput((p) => (p ? p + ' ' : '') + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    recRef.current = rec; setListening(true); void api.track('voice_input_started', { surface: 'active_session' }, id, session?.condition); rec.start();
  }

  useEffect(() => { api.getSession(id).then(setSession); api.getMessages(id).then(setMessages); }, [id]);
  const running = !!session?.timerSegments.at(-1) && !session.timerSegments.at(-1)!.endTime;
  useEffect(() => { if (!running) return; const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, [running]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);
  useEffect(() => () => {
    if (trackingWatchRef.current !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(trackingWatchRef.current);
  }, []);
  // T1: return-contingent trigger — learner comes back to a running session after being away
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'hidden') { hiddenSinceRef.current = Date.now(); return; }
      const awayMin = hiddenSinceRef.current ? (Date.now() - hiddenSinceRef.current) / 60000 : 0;
      hiddenSinceRef.current = null;
      if (!running || momentaryDue) return;
      if (awayMin >= 3 && checkCountRef.current < 2 && (Date.now() - lastCheckAtRef.current) / 60000 >= 8) setMomentaryDue('return');
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [running, momentaryDue]);
  // T1: log when a check surfaces
  useEffect(() => { if (momentaryDue && session) void api.track('momentary_check_shown', { trigger: momentaryDue }, id, session.condition); }, [momentaryDue]);
  useEffect(() => { trackingModeRef.current = trackingMode; }, [trackingMode]);
  useEffect(() => {
    if (mapLoggedRef.current) return;
    const point = liveMapPoints.at(-1) ?? (
      typeof session?.spatialTrace?.coarseLatitude === 'number' && typeof session.spatialTrace.coarseLongitude === 'number'
        ? { lat: session.spatialTrace.coarseLatitude, lng: session.spatialTrace.coarseLongitude, accuracy: session.spatialTrace.accuracyMeters, at: Date.now() }
        : undefined
    );
    if (!point) return;
    mapLoggedRef.current = true;
    void api.track('map_rendered', {
      surface: 'active_session',
      provider: 'openstreetmap',
      accuracyMeters: point.accuracy,
      live: trackingLive || session?.spatialTrace?.trackingState === 'live',
      rawLocationStored: false,
    }, id, session?.condition);
  }, [id, liveMapPoints, session, trackingLive]);

  // proactive scaffolding (RQ9): Marin initiates when the session opens
  const kicked = useRef(false);
  useEffect(() => {
    if (!session || kicked.current) return;
    if (session.scaffoldTiming === 'proactive' && messages.length === 0 && !streaming) {
      kicked.current = true;
      queueMicrotask(() => {
        const pid = nextLocalMessageId('a');
        setMessages((m) => [...m, { id: pid, sessionId: id, role: 'assistant', content: '', createdAt: new Date().toISOString() }]);
        setStreaming(true);
        void api.track('mentor_turn_started', { kickoff: true, messageCount: messages.length }, id, session.condition);
        streamChat(id, '',
          (full) => setMessages((m) => m.map((x) => (x.id === pid ? { ...x, content: full } : x))),
          (done) => {
            setMessages((m) => m.map((x) => (x.id === pid ? { ...x, id: done.id, label: done.label, hintLevel: done.hintLevel, checkpoint: done.checkpoint } : x)));
            void api.track('mentor_turn_completed', { kickoff: true, label: done.label, hintLevel: done.hintLevel, checkpoint: !!done.checkpoint }, id, session.condition);
          },
          true,
        ).catch((err) => {
          void api.track('client_error', { surface: 'active_session', action: 'mentor_kickoff', message: String(err).slice(0, 180) }, id, session.condition);
        }).finally(() => { setStreaming(false); api.getSession(id).then(setSession).catch(() => {}); });
      });
    }
  }, [session, messages.length, streaming, id]);

  if (!session) return <Screen pad={false}><div className="px-5 py-10"><Label>Loading…</Label></div></Screen>;

  async function patch(p: Partial<StudySession>) { setSession(await api.patchSession(id, p)); }
  function openMomentary() { if (!momentaryDue) setMomentaryDue('manual'); }
  function dismissMomentary() {
    lastCheckAtRef.current = Date.now();
    setMomentaryDue(null); setMFocus(null); setMFit(null);
  }
  async function submitMomentary(regulationAction: RegulationAction) {
    const current = session!;
    if (mFocus == null || mFit == null) return;
    const check: MomentaryCheck = {
      at: new Date().toISOString(),
      elapsedOnTaskMin: Math.round(elapsedMs(current.timerSegments) / 60000),
      trigger: momentaryDue ?? 'manual',
      focus: mFocus, contextFit: mFit, regulationAction,
      placeCategoryAtCheck: current.contextTrace?.placeCategory,
      mobilityStateAtCheck: current.spatialTrace?.mobilityState,
    };
    const fit = mFit, focus = mFocus;
    // eslint-disable-next-line react-hooks/purity -- event handler, not render
    lastCheckAtRef.current = Date.now(); checkCountRef.current += 1;
    setMomentaryDue(null); setMFocus(null); setMFit(null);
    void api.track('momentary_check_answered', { trigger: check.trigger, focus, contextFit: fit, regulationAction, elapsedOnTaskMin: check.elapsedOnTaskMin }, id, current.condition);
    if (regulationAction !== 'stayed' && regulationAction !== 'none')
      void api.track('context_regulated', { regulationAction, contextFit: fit, from: check.placeCategoryAtCheck }, id, current.condition);
    await patch({ momentaryChecks: [...(current.momentaryChecks ?? []), check] });
  }
  async function persistSpatialTrace(spatialTrace: StudySession['spatialTrace']) {
    if (!spatialTrace) return;
    setSession((cur) => (cur ? { ...cur, spatialTrace } : cur));
    try {
      setSession(await api.patchSession(id, { spatialTrace }));
    } catch {
      setTrackingError('Tracking is visible here, but the summary did not sync yet.');
    }
  }
  function chooseTrackingMode(mode: 'spot' | 'route') {
    setTrackingMode(mode);
    trackingModeRef.current = mode;
    void api.track('live_tracking_mode_changed', { mode }, id, session?.condition);
    if (!trackingStartedRef.current || trackPointsRef.current.length === 0) return;
    void persistSpatialTrace(liveSpatialTrace(trackPointsRef.current, trackingStartedRef.current, false, mode === 'spot'));
  }
  function markStayingStill() {
    setTrackingMode('spot');
    trackingModeRef.current = 'spot';
    if (!trackingStartedRef.current) trackingStartedRef.current = new Date().toISOString();
    void api.track('live_tracking_mode_changed', { mode: 'spot', learnerOverride: 'staying_still' }, id, session?.condition);
    void persistSpatialTrace(liveSpatialTrace(trackPointsRef.current, trackingStartedRef.current, false, true));
  }
  async function stopLiveTracking() {
    if (trackingWatchRef.current !== null) {
      navigator.geolocation.clearWatch(trackingWatchRef.current);
      trackingWatchRef.current = null;
    }
    setTrackingLive(false);
    const startedAt = trackingStartedRef.current ?? new Date().toISOString();
    void api.track('live_tracking_stopped', {
      mode: trackingModeRef.current,
      sampleCount: trackPointsRef.current.length,
      reason: 'user',
    }, id, session?.condition);
    await persistSpatialTrace(liveSpatialTrace(trackPointsRef.current, startedAt, true, trackingModeRef.current === 'spot'));
  }
  function startLiveTracking() {
    if (!('geolocation' in navigator)) {
      setTrackingError('This browser does not support live location tracking.');
      void persistSpatialTrace({
        acquisitionMode: 'auto',
        capturedAt: new Date().toISOString(),
        sources: ['gps'],
        permissionState: 'unsupported',
        mobilityState: 'unknown',
        trackingState: 'off',
        trackingMode: trackingModeRef.current === 'spot' ? 'study_spot' : 'route',
        rawLocationStored: false,
      });
      return;
    }
    if (trackingWatchRef.current !== null) return;
    setTrackingError('');
    setTrackingLive(true);
    trackingStartedRef.current = new Date().toISOString();
    trackPointsRef.current = [];
    setLiveMapPoints([]);
    trackingSampleLoggedRef.current = 0;
    void api.track('live_tracking_started', { mode: trackingModeRef.current }, id, session?.condition);
    trackingWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: TrackPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          at: pos.timestamp || Date.now(),
          accuracy: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : undefined,
          speed: typeof pos.coords.speed === 'number' && Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
        };
        const next = [...trackPointsRef.current, point].slice(-120);
        trackPointsRef.current = next;
        setLiveMapPoints(next);
        if (next.length === 1 || next.length - trackingSampleLoggedRef.current >= 5) {
          trackingSampleLoggedRef.current = next.length;
          void api.track('live_tracking_sampled', {
            mode: trackingModeRef.current,
            sampleCount: next.length,
            accuracyMeters: point.accuracy,
            speedMetersPerSecond: point.speed,
            rawLocationStored: false,
          }, id, session?.condition);
        }
        void persistSpatialTrace(liveSpatialTrace(next, trackingStartedRef.current!, false, trackingModeRef.current === 'spot'));
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setTrackingLive(false);
        trackingWatchRef.current = null;
        setTrackingError(denied ? 'Location permission was denied.' : 'Live location tracking could not start.');
        void api.track('client_error', {
          surface: 'active_session',
          action: 'live_tracking',
          permissionState: denied ? 'denied' : 'error',
          code: err.code,
          message: err.message,
        }, id, session?.condition);
        void persistSpatialTrace({
          acquisitionMode: 'auto',
          capturedAt: new Date().toISOString(),
          sources: ['gps'],
          permissionState: denied ? 'denied' : 'error',
          mobilityState: 'unknown',
          trackingState: 'off',
          trackingMode: trackingModeRef.current === 'spot' ? 'study_spot' : 'route',
          rawLocationStored: false,
        });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
    );
  }
  function toggleTimer() {
    const current = session!;
    const segs = [...current.timerSegments]; const last = segs.at(-1);
    if (last && !last.endTime) {
      last.endTime = new Date().toISOString();
      void api.track('timer_paused', { segmentCount: segs.length, elapsedMs: elapsedMs(segs) }, id, current.condition);
      patch({ timerSegments: segs, inProgress: false });
      // T1: break-contingent trigger
      if (!momentaryDue && elapsedMs(segs) / 60000 >= 10 && checkCountRef.current < 2 && (Date.now() - lastCheckAtRef.current) / 60000 >= 8) setMomentaryDue('break');
    } else {
      segs.push({ startTime: new Date().toISOString() });
      void api.track('timer_started', { segmentCount: segs.length }, id, current.condition);
      patch({ timerSegments: segs, inProgress: true });
    }
  }
  function tickGoal(gid: string) { patch({ goals: session!.goals.map((g) => (g.id === gid ? { ...g, isTicked: !g.isTicked } : g)) }); }

  async function send(text: string) {
    const current = session!;
    const content = text.trim(); if (!content || streaming) return;
    setInput('');
    const now = new Date().toISOString();
    setMessages((m) => [...m, { id: nextLocalMessageId('u'), sessionId: id, role: 'user', content, createdAt: now }]);
    const pid = nextLocalMessageId('a');
    setMessages((m) => [...m, { id: pid, sessionId: id, role: 'assistant', content: '', createdAt: now }]);
    setStreaming(true);
    void api.track('mentor_turn_started', {
      kickoff: false,
      contentLength: content.length,
      messageCount: messages.length,
    }, id, current.condition);
    try {
      await streamChat(id, content,
        (full) => setMessages((m) => m.map((x) => (x.id === pid ? { ...x, content: full } : x))),
        (done) => {
          setMessages((m) => m.map((x) => (x.id === pid ? { ...x, id: done.id, label: done.label, hintLevel: done.hintLevel, checkpoint: done.checkpoint } : x)));
          void api.track('mentor_turn_completed', {
            kickoff: false,
            label: done.label,
            hintLevel: done.hintLevel,
            checkpoint: !!done.checkpoint,
            displayLength: done.displayText.length,
          }, id, current.condition);
        });
    } catch (err) {
      void api.track('client_error', { surface: 'active_session', action: 'mentor_turn', message: String(err).slice(0, 180) }, id, current.condition);
    } finally { setStreaming(false); api.getSession(id).then(setSession).catch(() => {}); }
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const checkpoint = !streaming ? parseMentor(lastAssistant?.content ?? '').checkpoint : undefined;
  const elapsed = elapsedMs(session.timerSegments);
  const spatial = session.spatialTrace;
  const accuracyMeters = spatial?.accuracyMeters;
  const isIndoorCoarse = typeof accuracyMeters === 'number' && accuracyMeters > 45;
  const persistedMapPoint = typeof spatial?.coarseLatitude === 'number' && typeof spatial.coarseLongitude === 'number'
    ? { lat: spatial.coarseLatitude, lng: spatial.coarseLongitude, accuracy: spatial.accuracyMeters }
    : undefined;
  const mapPoints = trackingMode === 'route' ? liveMapPoints : liveMapPoints.slice(-1);

  return (
    <Screen pad={false}>
      <div className="pb-28">
        <TopBar section="02" title={session.subject}
          left={<button onClick={() => navigate({ to: '/' })} className="mr-1 text-lg text-ink/50">←</button>}
          right={<button onClick={async () => { if (trackingLive || trackingWatchRef.current !== null) await stopLiveTracking(); await patch({ inProgress: false }); navigate({ to: '/study/reflect/$id', params: { id } }); }} className="label-mono accent">Finish</button>} />

        {/* timer */}
        <div className="px-5 pt-8">
          <div className={`num text-7xl ${running ? 'accent' : 'text-ink'}`}>{fmt(elapsed)}</div>
          <div className="label-mono mt-2">On task · {taskLabel(session.taskKind)} · planned {session.plannedMinutes}m</div>
          <div className="mt-5 flex items-center gap-4">
            {running
              ? <GhostButton onClick={toggleTimer}>Pause</GhostButton>
              : <AccentButton onClick={toggleTimer}>{elapsed > 0 ? 'Resume' : 'Start studying'}</AccentButton>}
            {running && !momentaryDue && <button onClick={openMomentary} className="label-mono text-ink/45">Check in</button>}
          </div>
        </div>

        {/* T1 momentary check (in-session EMA at organic touchpoints) */}
        {momentaryDue && (
          <div className="mx-5 mt-6 rounded-2xl border border-accent/40 bg-accent/5 p-4">
            <div className="label-mono accent mb-2">
              Momentary check{momentaryDue === 'return' ? ' · welcome back' : momentaryDue === 'break' ? ' · taking a break' : ''}
            </div>
            <p className="text-sm font-medium">How's your focus right now?</p>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setMFocus(n as Rating)}
                  className={`h-9 w-9 rounded-full border text-sm ${mFocus === n ? 'border-accent bg-accent text-white' : 'border-black/25 text-ink/60'}`}>{n}</button>
              ))}
            </div>
            <p className="mt-3 text-sm font-medium">Is this spot working for you?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['good', 'mixed', 'poor'] as ContextFit[]).map((f) => (
                <button key={f} disabled={mFocus == null}
                  onClick={() => { setMFit(f); if (f === 'good' && mFocus != null) void submitMomentary('stayed'); }}
                  className={`rounded-md border px-3 py-1.5 text-sm capitalize disabled:opacity-40 ${mFit === f ? 'border-accent bg-accent text-white' : 'border-black/25 text-ink/65'}`}>{f}</button>
              ))}
            </div>
            {mFit && mFit !== 'good' && (
              <>
                <p className="mt-3 text-sm font-medium">What will you do about it?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([['changed_place', 'Change place'], ['removed_distraction', 'Remove distraction'], ['took_break', 'Take a break'], ['stayed', 'Stay here']] as [RegulationAction, string][]).map(([a, lbl]) => (
                    <button key={a} disabled={mFocus == null} onClick={() => void submitMomentary(a)}
                      className="rounded-md border border-accent px-3 py-1.5 text-sm text-accent disabled:opacity-40">{lbl}</button>
                  ))}
                </div>
              </>
            )}
            <button onClick={dismissMomentary} className="mt-3 text-xs text-ink/45">Not now</button>
          </div>
        )}

        {/* goals */}
        {session.goals.length > 0 && (
          <div className="mt-9">
            <div className="px-5"><Label>/ Goals</Label></div>
            <Rule className="mt-3" />
            {session.goals.map((g) => (
              <button key={g.id} onClick={() => tickGoal(g.id)} className="flex w-full items-center gap-3 border-b border-black/10 px-5 py-3.5 text-left">
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs text-white ${g.isTicked ? 'bg-accent border-accent' : 'border-black/30'}`}>{g.isTicked ? '✓' : ''}</span>
                <span className={g.isTicked ? 'text-ink/40 line-through' : ''}>{g.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* mentor */}
        <div className="mt-9 flex items-end justify-between px-5">
          <Label>/ Marin — asks, not answers</Label>
          <button onClick={() => setStretchOpen(true)} className="label-mono accent">Stretch me</button>
        </div>
        {isInstructor() && session.lastPolicy && (
          <div className="mx-5 mt-3 rounded-md border border-black/12 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="label-mono accent">Policy: {session.lastPolicy.action.replace(/_/g, ' ')}</span>
              <span className="label-mono">{Math.round(session.lastPolicy.confidence * 100)}%</span>
            </div>
            <p className="mt-1 text-xs text-ink/50">{session.lastPolicy.reason}</p>
          </div>
        )}
        {session.contextTrace && session.contextTrace.placeCategory !== 'not_shared' && (
          <div className="mx-5 mt-2 text-xs text-ink/45">
            Context: {session.contextTrace.placeLabel || session.contextTrace.placeCategory.replace(/_/g, ' ')}
            {session.contextTrace.intentionallyChosen ? ' · intentionally chosen' : ''}
          </div>
        )}
        {session.spatialTrace && session.spatialTrace.acquisitionMode !== 'off' && (
          <div className="mx-5 mt-1 text-xs text-ink/45">
            Spatial: {session.spatialTrace.acquisitionMode} · {session.spatialTrace.sources.join(' + ') || 'no sensor'} · {session.spatialTrace.mobilityState}
            {session.spatialTrace.accuracyMeters ? ` · ~${session.spatialTrace.accuracyMeters}m` : ''}
          </div>
        )}
        <div className="mx-5 mt-3 rounded-md border border-black/12 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="label-mono accent">Live tracking</div>
              <p className="mt-1 text-xs text-ink/50">Foreground only. Exact GPS route is not stored.</p>
            </div>
            <button
              type="button"
              onClick={trackingLive ? stopLiveTracking : startLiveTracking}
              className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold ${trackingLive ? 'border-black/20 text-ink' : 'border-accent bg-accent text-white'}`}
            >
              {trackingLive ? 'Stop' : 'Start'}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <div className="rounded border border-black/10 py-2"><div className="label-mono">Samples</div><div className="num text-lg">{spatial?.sampleCount ?? 0}</div></div>
            <div className="rounded border border-black/10 py-2"><div className="label-mono">Meters</div><div className="num text-lg">{Math.round(spatial?.distanceMeters ?? 0)}</div></div>
            <div className="rounded border border-black/10 py-2"><div className="label-mono">Dwell</div><div className="num text-lg">{Math.round((spatial?.dwellSeconds ?? 0) / 60)}m</div></div>
            <div className="rounded border border-black/10 py-2"><div className="label-mono">State</div><div className="text-xs capitalize">{spatial?.mobilityState ?? 'unknown'}</div></div>
          </div>
          <div className="mt-3 grid grid-cols-2 rounded-md border border-black/10 bg-white/70 p-1">
            {[
              ['spot', 'Study spot'],
              ['route', 'Route'],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => chooseTrackingMode(mode as 'spot' | 'route')}
                className={`rounded px-3 py-2 text-xs font-semibold ${trackingMode === mode ? 'bg-ink text-canvas shadow-sm' : 'text-ink/55'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={markStayingStill}
            className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-ink/60"
          >
            I'm staying still
          </button>
          <div className="mt-3">
            <LocationMap
              center={liveMapPoints.at(-1) ?? persistedMapPoint}
              points={mapPoints}
              live={trackingLive || spatial?.trackingState === 'live'}
              label="Live study location on an OpenStreetMap tile map"
            />
            <p className="mt-2 text-xs text-ink/45">
              This map uses the current GPS point while the session is open. The saved research trace keeps only rounded coordinates, accuracy, and movement summaries.
            </p>
          </div>
          {trackingError && <p className="mt-2 text-xs text-red-700">{trackingError}</p>}
          {isIndoorCoarse && (
            <p className="mt-2 text-xs text-amber-800">
              Indoor GPS is broad in apartments. SAIL uses this as a coarse study-context signal, not an exact home location.
            </p>
          )}
          {spatial?.trackingState && (
            <p className="mt-2 text-xs text-ink/45">
              {spatial.trackingState === 'live' ? 'Tracking now' : spatial.trackingState === 'ended' ? 'Tracking ended' : 'Tracking off'}
              {spatial.lastSampleAt ? ` · last sample ${new Date(spatial.lastSampleAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          )}
        </div>
        <div className="mt-4 space-y-4 px-5">
          {messages.length === 0 && <p className="text-sm text-ink/50">Tell Marin what you're working on. Marin coaches with questions and graded hints, never the answer.</p>}
          {messages.map((m) => {
            if (m.role === 'user') return (
              <div key={m.id} className="flex justify-end"><div className="max-w-[82%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-canvas">{m.content}</div></div>
            );
            const p = parseMentor(m.content);
            return (
              <div key={m.id} className="max-w-[88%]">
                {labelBadge(p.label) && <div className="label-mono mb-1 accent">{labelBadge(p.label)}</div>}
                <div className="rounded-2xl rounded-bl-sm border border-black/15 px-4 py-2.5">
                  <Suspense fallback={<div className="whitespace-pre-wrap text-sm">{p.displayText || '…'}</div>}><MentorText text={p.displayText || '…'} /></Suspense>
                </div>
              </div>
            );
          })}
          {checkpoint && (
            <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3">
              <p className="text-sm font-medium">{checkpoint.prompt}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {checkpoint.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      void api.track('checkpoint_answered', { optionId: o.id, optionLength: o.text.length }, id, session.condition);
                      send(o.text);
                    }}
                    className="rounded-md border border-accent px-3 py-1 text-sm text-accent"
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>
      </div>

      {/* fixed input bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-black/12 bg-canvas px-3 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.6rem)' }}>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
          {SR && (
            <button type="button" onClick={toggleMic} title="Voice input" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg ${listening ? 'border-accent text-accent' : 'border-black/20 text-ink/50'}`}>🎤</button>
          )}
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={streaming ? 'Marin is replying…' : listening ? 'Listening…' : 'Ask Marin…'} disabled={streaming}
            className="min-w-0 flex-1 rounded-full border border-black/20 bg-transparent px-4 py-2.5 outline-none focus:border-accent" />
          <button disabled={streaming} className="btn-accent grid h-11 w-11 shrink-0 place-items-center text-lg disabled:opacity-40">↑</button>
        </form>
      </div>
      {stretchOpen && <MarinChat mode="stretch" sessionId={id} onClose={() => setStretchOpen(false)} />}
    </Screen>
  );
}
