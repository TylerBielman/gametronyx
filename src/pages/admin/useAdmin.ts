import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

/** Load admin data with the session token; `reload` refetches. */
export function useAdmin<T>(load: (token: string) => Promise<T>, deps: unknown[] = []) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!token) return;
    load(token)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ...deps]);
  useEffect(reload, [reload]);
  return { data, error, reload, token };
}

/** Run an admin action, reporting its outcome as a notice. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const run = useCallback(async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      if (success) setNote({ tone: 'success', text: success });
      return true;
    } catch (e) {
      setNote({ tone: 'error', text: e instanceof ApiError ? e.message : 'Something went wrong.' });
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, note, setNote, run };
}
