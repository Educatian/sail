import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Screen, TopBar, Label, AccentButton, Rule } from '../components/editorial';
import { Reveal } from '../components/ui';
import { api } from '../lib/api';

// Baseline self-regulation self-report (RQ12 moderator). 1 = strongly disagree, 5 = strongly agree.
const ITEMS = [
  'I set specific goals before I start studying.',
  'I check whether I actually understand while studying.',
  'I keep working even when the material gets difficult.',
  'When stuck, I seek help to understand (not just to get the answer).',
  'After studying, I reflect on what worked and adjust next time.',
];

export function Intake() {
  const navigate = useNavigate();
  const [vals, setVals] = useState<(number | undefined)[]>(Array(ITEMS.length).fill(undefined));
  const [busy, setBusy] = useState(false);
  const done = vals.every((v) => typeof v === 'number');

  async function save() {
    setBusy(true);
    try { await api.putProfile(vals.map((v) => v ?? 3)); navigate({ to: '/' }); }
    finally { setBusy(false); }
  }

  return (
    <Screen>
      <TopBar section="00" title="Baseline" left={<button onClick={() => navigate({ to: '/' })} className="mr-1 text-lg text-ink/50">←</button>} />
      <div className="px-5 pt-6">
        <p className="text-sm text-ink/60">A one-minute self-check before you start. It helps SAIL (and the research) see who the mentor helps most.</p>
        <p className="label-mono mt-3 normal-case tracking-normal" style={{ letterSpacing: 0 }}>1 = strongly disagree · 5 = strongly agree</p>
      </div>

      <div className="mt-6 space-y-7 px-5">
        {ITEMS.map((item, i) => (
          <Reveal key={i} delay={Math.min(i * 0.05, 0.25)}>
            <Label className="mb-2 normal-case tracking-normal" >{`${String(i + 1).padStart(2, '0')} · ${item}`}</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setVals((a) => a.map((x, k) => (k === i ? n : x)))}
                  className={`h-11 flex-1 rounded-md border text-sm transition-colors ${vals[i] === n ? 'border-ink bg-ink font-semibold text-canvas' : 'border-black/20 text-ink/55'}`}>{n}</button>
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      <Rule className="mt-8" />
      <div className="px-5 py-6"><AccentButton onClick={save} disabled={busy || !done}>{busy ? 'Saving…' : done ? 'Save baseline →' : 'Answer all 5'}</AccentButton></div>
    </Screen>
  );
}
