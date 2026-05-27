import { motion } from 'motion/react';

const COLORS = ['#ff3b2e', '#0b0b0c', '#c2f24e', '#6d5ef0', '#f59e0b'];
const PIECES = Array.from({ length: 28 }, (_, i) => {
  const seed = (i * 37) % 101;
  return {
    duration: 0.9 + ((seed % 9) / 10),
    rotation: ((seed % 17) - 8) * 42,
    left: `${(i * 29) % 100}%`,
  };
});

/** Brief celebratory burst (achievement moment). Render conditionally for ~1s. */
export function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {PIECES.map((piece, i) => {
        return (
          <motion.div
            key={i}
            initial={{ top: '-5%', left: piece.left, opacity: 1, rotate: 0 }}
            animate={{ top: '110%', rotate: piece.rotation, opacity: [1, 1, 0] }}
            transition={{ duration: piece.duration, ease: 'easeIn' }}
            style={{ position: 'absolute', width: 8, height: 13, background: COLORS[i % COLORS.length], borderRadius: 2 }}
          />
        );
      })}
    </div>
  );
}
