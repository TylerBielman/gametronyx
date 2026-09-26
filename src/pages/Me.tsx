import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import MySessions from '../components/MySessions';
import { Field, Notice, PageHeader, Panel } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

const MIN_PASSWORD = 8;

function EmailForm() {
  const { user, token, setUser } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setNote(null);
    try {
      const updated = await api.updateMe(token, { email: email.trim() });
      const changed = updated.email?.toLowerCase() !== user?.email?.toLowerCase();
      setUser(updated);
      setNote({ tone: 'success', text: changed ? 'Saved. Check your inbox to confirm the new address.' : 'Saved.' });
    } catch (err) {
      setNote({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!token) return;
    try {
      await api.resendVerification(token);
      setNote({ tone: 'success', text: 'A new confirmation link is on its way.' });
    } catch (err) {
      setNote({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not send the email.' });
    }
  }

  return (
    <Panel className="mb-6">
      <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Email</h2>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <form onSubmit={submit}>
        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          hint={
            user?.email_verified ? (
              <span className="text-cash">✓ Confirmed</span>
            ) : user?.email ? (
              <>
                Not confirmed yet.{' '}
                <button type="button" className="font-semibold text-gold underline" onClick={resend}>
                  Resend link
                </button>
              </>
            ) : undefined
          }
        />
        <button type="submit" className="btn gold" disabled={busy}>
          {busy ? 'Saving…' : 'Save email'}
        </button>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const { token, acceptToken } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const nextError = next && next.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters.` : null;
  const confirmError = confirm && confirm !== next ? "Passwords don't match." : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || nextError || confirmError || !next) return;
    setBusy(true);
    setNote(null);
    try {
      await acceptToken(await api.changePassword(token, current, next));
      setCurrent('');
      setNext('');
      setConfirm('');
      setNote({ tone: 'success', text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      setNote({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not change the password.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="mb-6">
      <h2 className="mb-1 font-display text-lg uppercase tracking-wide">Password</h2>
      <p className="mb-4 text-sm text-[var(--muted)]">Also your No Easy Way Up password.</p>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <form onSubmit={submit}>
        <Field label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        <Field label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" error={nextError} />
        <Field label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" error={confirmError} />
        <button type="submit" className="btn gold" disabled={busy}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </Panel>
  );
}

export default function Me() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="Your account" title={user?.username ?? 'Account'}>
        Your username can't be changed here. It's the same on No Easy Way Up.
      </PageHeader>
      <MySessions />
      <EmailForm />
      <PasswordForm />
      <Link to="/logout" className="btn ghost w-full">
        Log out
      </Link>
    </div>
  );
}
