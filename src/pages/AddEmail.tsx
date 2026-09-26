import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { safeNext } from '../components/RequireAuth';
import { Field, Notice, PageHeader, Panel } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

/** One-time step for No Easy Way Up accounts, which have no email yet. */
export default function AddEmail() {
  const { user, token, setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && !user.needs_email) return <Navigate to={next} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      setUser(await api.updateMe(token, { email: email.trim() }));
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="One more thing" title="Add your email">
        Your No Easy Way Up account works here, but it doesn't have an email yet. Gametronyx uses it for playtest
        reminders and password resets, and never shows it publicly.
      </PageHeader>
      <Panel>
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={submit}>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <button type="submit" className="btn primary w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </Panel>
    </div>
  );
}
