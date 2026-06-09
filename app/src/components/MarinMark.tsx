/**
 * Marin's visual identity — an abstract compass-rose mark (navigation = guidance).
 * Hand-coded inline SVG placeholder, on-brand (cozy nautical). Swappable later with a
 * Higgsfield-generated mark by dropping /art/marin-mark.svg and pointing here.
 * Uses currentColor so it adapts: cream on the teal FAB, teal on light headers.
 */
export function MarinMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      {/* four-point compass star (concave diamond) */}
      <path
        d="M12 2.2l1.9 8 8 1.8-8 1.8L12 21.8l-1.9-8-8-1.8 8-1.8L12 2.2z"
        fill="currentColor"
      />
      {/* hollow center, reads as a compass hub */}
      <circle cx="12" cy="12" r="1.7" fill="var(--color-canvas)" />
    </svg>
  );
}
