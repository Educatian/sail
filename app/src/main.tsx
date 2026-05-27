import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRootRoute, createRoute, createRouter, RouterProvider,
} from '@tanstack/react-router';
import './index.css';
import { RootLayout } from './AppShell';
import { Home } from './routes/Home';
import { GoalStudio } from './routes/GoalStudio';
import { ActiveSession } from './routes/ActiveSession';
import { Reflection } from './routes/Reflection';
import { Dashboard } from './routes/Dashboard';
import { ResearchEvidence } from './routes/ResearchEvidence';
import { Intake } from './routes/Intake';

const rootRoute = createRootRoute({ component: RootLayout });
const routes = [
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home }),
  createRoute({ getParentRoute: () => rootRoute, path: '/study/new', component: GoalStudio }),
  createRoute({ getParentRoute: () => rootRoute, path: '/study/active/$id', component: ActiveSession }),
  createRoute({ getParentRoute: () => rootRoute, path: '/study/reflect/$id', component: Reflection }),
  createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: Dashboard }),
  createRoute({ getParentRoute: () => rootRoute, path: '/research', component: ResearchEvidence }),
  createRoute({ getParentRoute: () => rootRoute, path: '/intake', component: Intake }),
];
const router = createRouter({ routeTree: rootRoute.addChildren(routes) });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
