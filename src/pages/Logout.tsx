import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/** Sign out from a public route. Logging out while a RequireAuth page is on
 *  screen would bounce to /login?next=… before a navigation to / lands. */
export default function Logout() {
  const { status, logout } = useAuth();
  useEffect(() => {
    if (status !== 'anon') logout();
  }, [status, logout]);
  return status === 'anon' ? <Navigate to="/" replace /> : null;
}
