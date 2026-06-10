/**
 * MarinLoader — the single, on-brand "the system is working" indicator, used
 * everywhere SAIL is busy (route/data spinners, Marin thinking while streaming).
 *
 * Primary: a small gentle nautical loop video at /art/loop/marin-loop.mp4 IF present
 * (≤120px, muted, playsinline, looping). Fallback (and the instant first-paint case,
 * and prefers-reduced-motion): a crisp CSS/SVG compass-rose whose needle sweeps gently.
 *
 * Session lessons honored: the video is SMALL, muted, playsinline, NO mix-blend-mode,
 * and we fall back instantly to the CSS mark if the mp4 is absent or fails, or if the
 * user prefers reduced motion.
 */
import { useEffect, useState } from 'react';

const LOOP_SRC = '/art/loop/marin-loop.mp4';
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// probe once per session whether the loop video exists, so we don't flash a broken element
let _loopStatus: 'unknown' | 'present' | 'absent' = 'unknown';
const _waiters = new Set<(s: 'present' | 'absent') => void>();
function probeLoop() {
  if (_loopStatus !== 'unknown') return;
  if (typeof fetch === 'undefined') { _loopStatus = 'absent'; return; }
  fetch(LOOP_SRC, { method: 'HEAD' })
    .then((r) => { _loopStatus = r.ok ? 'present' : 'absent'; })
    .catch(() => { _loopStatus = 'absent'; })
    .finally(() => { _waiters.forEach((w) => w(_loopStatus as 'present' | 'absent')); _waiters.clear(); });
}

export function CompassMark({ size = 40 }: { size?: number }) {
  return (
    <svg className="marin-loader__svg" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* compass ring */}
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity="0.28" />
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="6 120" strokeLinecap="round" opacity="0.6" />
      {/* sweeping needle (the only animated part) */}
      <g className="marin-loader__needle">
        <path d="M24 7 L27 24 L24 41 L21 24 Z" fill="currentColor" opacity="0.9" />
      </g>
      <circle cx="24" cy="24" r="2.4" fill="var(--color-canvas)" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function MarinLoader({ size = 40, label = 'Working…' }: { size?: number; label?: string }) {
  const reduce = prefersReducedMotion();
  const [useVideo, setUseVideo] = useState(_loopStatus === 'present' && !reduce);

  useEffect(() => {
    // reduced motion → always the static/animated mark, never video.
    // If the probe already resolved, the useState initializer covered it; only an
    // as-yet-unknown status needs us to subscribe and trigger the one-time probe.
    if (reduce || _loopStatus !== 'unknown') return;
    const onResolve = (s: 'present' | 'absent') => setUseVideo(s === 'present');
    _waiters.add(onResolve);
    probeLoop();
    return () => { _waiters.delete(onResolve); };
  }, [reduce]);

  return (
    <span className="marin-loader" role="status" aria-label={label}>
      {useVideo ? (
        <video
          className="marin-loader__video"
          style={{ height: size * 3 }}
          src={LOOP_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setUseVideo(false)}
        />
      ) : (
        <CompassMark size={size} />
      )}
    </span>
  );
}
