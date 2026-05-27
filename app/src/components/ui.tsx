import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion } from 'motion/react';

/** Animated count-up number. */
export function CountUp({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(value % 1 === 0 ? Math.round(v) : Math.round(v * 10) / 10),
    });
    return () => controls.stop();
  }, [value]);
  return <span className={className}>{n}{suffix}</span>;
}

/** Fade + slide-up entrance, with optional stagger delay. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Tap-springy wrapper for touch feedback. */
export function Tappable({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef(null);
  return (
    <motion.div ref={ref} className={className} onClick={onClick} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
      {children}
    </motion.div>
  );
}
