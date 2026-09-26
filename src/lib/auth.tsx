import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, browserTimezone, type RegisterInput, type User } from './api';
import { loadToken, saveToken } from './storage';

type Status = 'loading' | 'anon' | 'authed';

interface AuthValue {
  status: Status;
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<User>;
  register: (input: Omit<RegisterInput, 'timezone'>) => Promise<User>;
  /** Adopt a token from reset / password change, then load the user. */
  acceptToken: (token: string) => Promise<User>;
  setUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => loadToken());
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>(() => (loadToken() ? 'loading' : 'anon'));

  const logout = useCallback(() => {
    saveToken(null);
    setToken(null);
    setUserState(null);
    setStatus('anon');
  }, []);

  const acceptToken = useCallback(async (next: string) => {
    let me = await api.me(next);
    // Capture the time zone once, for playtest times in emails (A23).
    const tz = browserTimezone();
    if (!me.timezone && tz) {
      try {
        me = await api.updateMe(next, { timezone: tz });
      } catch {
        /* not worth blocking login over */
      }
    }
    saveToken(next);
    setToken(next);
    setUserState(me);
    setStatus('authed');
    return me;
  }, []);

  // Validate a stored token on boot.
  useEffect(() => {
    const stored = loadToken();
    if (!stored) return;
    let cancelled = false;
    acceptToken(stored).catch((err) => {
      if (cancelled) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        logout();
      } else {
        // Offline or server trouble: keep the token, treat as logged out for now.
        setStatus('anon');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [acceptToken, logout]);

  const login = useCallback(
    async (identifier: string, password: string) => acceptToken(await api.login(identifier, password)),
    [acceptToken],
  );

  const register = useCallback(
    async (input: Omit<RegisterInput, 'timezone'>) =>
      acceptToken(await api.register({ ...input, timezone: browserTimezone() })),
    [acceptToken],
  );

  const setUser = useCallback((next: User) => setUserState(next), []);

  const value = useMemo<AuthValue>(
    () => ({ status, user, token, login, register, acceptToken, setUser, logout }),
    [status, user, token, login, register, acceptToken, setUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
