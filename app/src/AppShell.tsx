import { useState } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Landing } from './routes/Landing';
import { getStudent } from './lib/api';

function Icon({ d, active }: { d: string; active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const TABS = [
  { to: '/', label: 'Sessions', d: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/study/new', label: 'New', d: 'M12 5v14M5 12h14' },
  { to: '/dashboard', label: 'Progress', d: 'M3 3v18h18M7 14l3-3 3 3 5-6' },
] as const;

function BottomTab() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-canvas/85 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {TABS.map((t) => {
          const active = path === t.to;
          return (
            <button key={t.to} onClick={() => navigate({ to: t.to })} className={`flex flex-1 flex-col items-center gap-1.5 py-3 transition-colors ${active ? 'text-accent' : 'text-ink/40'}`}>
              <Icon d={t.d} active={active} />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em]">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function RootLayout() {
  const [authed, setAuthed] = useState(!!getStudent());
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hideTabs = path.startsWith('/study/active') || path.startsWith('/study/reflect');
  const allowSharedSessionLink = hideTabs;
  if (!authed && !allowSharedSessionLink) return <Landing onAuthed={() => setAuthed(true)} />;
  return (
    <>
      <Outlet />
      {authed && !hideTabs && <BottomTab />}
    </>
  );
}
