import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field, Notice, PageHeader, Panel } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useHashParam } from '../lib/useHashParam';

const MIN_PASSWORD = 8;

function RequestForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="Forgot your password?" title="Reset password">
        Enter the email on your account and we'll send you a link to choose a new password.
      </PageHeader>
      <Panel>
        {sent ? (
          <Notice tone="success">
            If <strong>{email.trim()}</strong> belongs to an account, a reset link is on its way. It works once and
            expires in 1 hour.
          </Notice>
        ) : (
          <>
            {error && <Notice tone="error">{error}</Notice>}
            <form onSubmit={submit}>
              <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <button type="submit" className="btn primary w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p className="mt-5 text-sm text-[var(--muted)]">
          No Easy Way Up account without an email? Ask Tyler to reset it for you.
        </p>
      </Panel>
    </div>
  );
}

function NewPasswordForm({ resetToken }: { resetToken: string }) {
  const { acceptToken } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = password && password.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters.` : null;
  const confirmError = confirm && confirm !== password ? "Passwords don't match." : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (passwordError || confirmError || !password) return;
    setBusy(true);
    setError(null);
    try {
      await acceptToken(await api.confirmReset(resetToken, password));
      navigate('/play', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="Almost done" title="Choose a new password">
        This also changes your No Easy Way Up password and signs you out everywhere else.
      </PageHeader>
      <Panel>
        {error && (
          <Notice tone="error">
            {error} <Link to="/reset">Request a new link</Link>.
          </Notice>
        )}
        <form onSubmit={submit}>
          <Field
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            error={passwordError}
          />
          <Field
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            error={confirmError}
          />
          <button type="submit" className="btn primary w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </Panel>
    </div>
  );
}

export default function Reset() {
  const resetToken = useHashParam('token');
  return resetToken ? <NewPasswordForm key={resetToken} resetToken={resetToken} /> : <RequestForm />;
}
