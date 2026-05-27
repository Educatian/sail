import { useEffect, useState } from 'react';

const KEY = 'sail-dark';

export function applyDark(on: boolean) {
  document.documentElement.classList.toggle('dark', on);
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore storage errors */ }
}

export function initDark() {
  let on = false;
  try {
    const saved = localStorage.getItem(KEY);
    on = saved == null ? window.matchMedia('(prefers-color-scheme: dark)').matches : saved === '1';
  } catch { /* ignore storage errors */ }
  document.documentElement.classList.toggle('dark', on);
  return on;
}

export function useDark(): [boolean, () => void] {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => { applyDark(dark); }, [dark]);
  return [dark, () => setDark((d) => !d)];
}
