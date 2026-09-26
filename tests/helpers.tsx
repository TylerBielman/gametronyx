import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../src/lib/auth';

export interface MockRoute {
  method?: string;
  path: string;
  status?: number;
  body?: unknown;
}

/** Stub fetch with canned API responses; returns the mock for call inspection. */
export function mockApi(routes: MockRoute[]) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = new URL(url, 'http://x').pathname.replace(/^\/api/, '');
    const hit = routes.find((r) => r.path === path && (r.method ?? 'GET').toUpperCase() === method);
    if (!hit) return new Response(JSON.stringify({ detail: `unmocked ${method} ${path}` }), { status: 500 });
    return new Response(hit.body === undefined ? '' : JSON.stringify(hit.body), { status: hit.status ?? 200 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

export function renderAt(path: string, routes: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>{routes}</Routes>
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  );
}

export const PLAYER = {
  id: 1,
  username: 'Ada',
  created_at: null,
  email: 'ada@example.test',
  email_verified: true,
  needs_email: false,
  role: 'player',
  timezone: 'UTC',
  reminder_default: false,
};
