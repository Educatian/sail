import type { ReactNode } from 'react';
import { motion } from 'motion/react';

/** Scrollable screen on the paper canvas. */
export function Screen({ children, pad = true }: { children: ReactNode; pad?: boolean }) {
  return <div className={`min-h-full bg-canvas ${pad ? 'pb-28' : ''}`}>{children}</div>;
}

/** Swiss top bar: SAIL / NN section marker + big bold title + rule. */
export function TopBar({ section, title, left, right }: { section?: string; title?: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          {left}
          <span className="font-mono text-xs uppercase tracking-[0.25em]">SAIL</span>
          {section && <span className="accent font-mono text-xs uppercase tracking-[0.25em]">/ {section}</span>}
        </div>
        {right}
      </div>
      {title && <h1 className="font-display mt-4 text-4xl font-bold tracking-tight">{title}</h1>}
      {title && <div className="rule mt-4 h-px w-full" />}
    </div>
  );
}

export function Rule({ bold = false, className = '' }: { bold?: boolean; className?: string }) {
  return <div className={`${bold ? 'rule-bold h-0.5' : 'rule h-px'} w-full ${className}`} />;
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`label-mono ${className}`}>{children}</div>;
}

/** Oversized bold numeral + mono caption. */
export function Stat({ value, caption, size = 'md', accent = false }: { value: ReactNode; caption?: string; size?: 'hero' | 'md' | 'sm'; accent?: boolean }) {
  const sz = size === 'hero' ? 'text-7xl' : size === 'md' ? 'text-4xl' : 'text-2xl';
  return (
    <div>
      <div className={`num ${sz} ${accent ? 'accent' : 'text-ink'}`}>{value}</div>
      {caption && <div className="label-mono mt-2">{caption}</div>}
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <Label className="mb-2">{label}</Label>
      <input
        {...props}
        className="w-full border-b border-black/20 bg-transparent pb-2 font-display text-xl font-medium outline-none transition-colors placeholder:font-sans placeholder:text-base placeholder:text-black/25 focus:border-accent"
      />
    </label>
  );
}

export function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <Label className="mb-2">{label}</Label>
      <textarea
        {...props}
        className="w-full resize-none rounded border border-black/20 bg-transparent p-3 outline-none transition-colors placeholder:text-black/25 focus:border-accent"
      />
    </label>
  );
}

export function PillGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-ink/25">
      {options.map((o, i) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2.5 text-sm transition-colors ${i > 0 ? 'border-l border-ink/20' : ''} ${value === o.value ? 'bg-ink font-semibold text-canvas' : 'text-ink/55'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, onChange, suffix = '' }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="num text-lg">{value}{suffix}</span>
      </div>
      <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-accent" />
    </div>
  );
}

export function Tag({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${active ? 'border-accent bg-accent/8 text-accent' : 'border-black/15 text-ink/55'}`}
    >
      {children}
    </button>
  );
}

export function AccentButton({ children, onClick, disabled, full = true }: { children: ReactNode; onClick?: () => void; disabled?: boolean; full?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      disabled={disabled}
      className={`btn-accent py-4 text-base tracking-wide uppercase ${full ? 'w-full' : 'px-8'} disabled:opacity-40`}
    >
      {children}
    </motion.button>
  );
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onClick} className="btn-ghost w-full py-4 text-base uppercase tracking-wide">
      {children}
    </motion.button>
  );
}

/** Hairline-separated tappable row. */
export function Row({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-black/12 px-5 py-4 text-left transition-colors active:bg-black/[0.03]">
      {children}
    </button>
  );
}
