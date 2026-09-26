import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Spinner } from './ui';

/** Gate for player pages. NEWU accounts without an email get the one-time
 *  "add your email" step first (DESIGN §4.2). */
export default function RequireAuth({ children, allowMissingEmail = false }: { children: ReactNode; allowMissingEmail?: boolean }) {
  const { status, user } = useAuth();
  const location = useLocation();
  const next = location.pathname + location.search;

  if (status === 'loading') return <Spinner />;
  if (status !== 'authed' || !user) {
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  if (user.needs_email && !allowMissingEmail) {
    return <Navigate to={`/add-email?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(raw: string | null, fallback = '/play'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}
