/**
 * AmbientMood — a SUBTLE full-bleed background that cross-fades between four mood
 * illustrations as the learner's affect / SRL phase changes. "The system responds
 * to learner state," felt rather than announced.
 *
 * Session lessons honored:
 *  - faint (opacity ~0.10–0.16), pointer-events:none, fixed behind all content
 *  - NO mix-blend-mode (compositor jank), NO video, NO autoplay
 *  - gentle opacity cross-fade (~600ms); prefers-reduced-motion → instant swap
 *  - only the baseline (calm) image is preloaded; the others lazy-load on first use
 *  - instructor view is left clean (AppShell passes mood=null there)
 */
import { useState } from 'react';

export type Mood = 'calm' | 'flow' | 'struggle' | 'harbor';

const SRC: Record<Mood, string> = {
  calm: '/art/mood/mood-calm.webp',
  flow: '/art/mood/mood-flow.webp',
  struggle: '/art/mood/mood-struggle.webp',
  harbor: '/art/mood/mood-harbor.webp',
};

const ALT: Record<Mood, string> = {
  calm: 'Calm still water at dawn',
  flow: 'A sailboat moving with a bright wake',
  struggle: 'Mist with a guiding lighthouse beam',
  harbor: 'Arrival at a cozy harbor',
};

const MOODS = Object.keys(SRC) as Mood[];

export function AmbientMood({ mood }: { mood: Mood | null }) {
  // remember which moods have ever been active so we only fetch them on demand
  // (calm is always loaded as the baseline). Updating during render via setState is
  // fine here — it converges in one extra render and never loops.
  const [seen, setSeen] = useState<Set<Mood>>(() => new Set<Mood>(['calm']));
  const shown: Mood = mood ?? 'calm';
  if (mood && !seen.has(mood)) {
    setSeen((prev) => { const next = new Set(prev); next.add(mood); return next; });
  }

  // instructor / research views pass null → render nothing (keeps data legible & clean)
  if (mood === null) return null;

  return (
    <div aria-hidden className="ambient-mood" data-mood={shown}>
      {MOODS.map((m) => (
        <img
          key={m}
          src={seen.has(m) ? SRC[m] : undefined}
          alt={ALT[m]}
          // baseline preloads eagerly; the rest only fetch once they've been the active mood
          loading={m === 'calm' ? 'eager' : 'lazy'}
          decoding="async"
          className="ambient-mood__img"
          style={{ opacity: m === shown ? undefined : 0 }}
        />
      ))}
    </div>
  );
}
