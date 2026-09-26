import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field, Notice, PageHeader, Panel } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useHashParam } from '../lib/useHashParam';

const MIN_PASSWORD = 8;
// The API says why a code failed; the site deliberately doesn't (DESIGN §5.3).
const BAD_CODE = "That code isn't valid. Check it and try again, or request an invite.";

export default function Join() {
  const { status, user, register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // /join#code=XXXX from an approved invite email.
  const fromLink = useHashParam('code');
  useEffect(() => {
    if (fromLink) {
      setCode(fromLink.toUpperCase());
      setStep(1);
    }
  }, [fromLink]);

  if (status === 'authed' && user) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader kicker="Already in" title={`Hi, ${user.username}`}>
          You're logged in, so there's no need for another account.
        </PageHeader>
        <Link to="/play" className="btn primary">
          Go to your playtests
        </Link>
      </div>
    );
  }

  async function checkCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.inviteCheck(code.trim());
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? BAD_CODE : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const passwordError = password && password.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters.` : null;
  const confirmError = confirm && confirm !== password ? "Passwords don't match." : null;

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    if (passwordError || confirmError || !password) return;
    setBusy(true);
    setError(null);
    try {
      await register({ invite_code: code.trim(), email: email.trim(), username: username.trim(), password });
      navigate('/play', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && /invite/i.test(err.message)) {
        setStep(1);
        setError(BAD_CODE);
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker={`Step ${step} of 2`} title={step === 1 ? 'Enter your invite code' : 'Create your account'}>
        {step === 1 ? (
          <>
            Playing No Easy Way Up already? <Link to="/login">Log in</Link> with that account instead.
          </>
        ) : (
          'This account also works on No Easy Way Up.'
        )}
      </PageHeader>
      <Panel>
        {error && <Notice tone="error">{error}</Notice>}
        {step === 1 ? (
          <form onSubmit={checkCode}>
            <Field
              label="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="field-input font-mono tracking-widest"
            />
            <button type="submit" className="btn primary w-full" disabled={busy || !code.trim()}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
            <p className="mt-5 text-sm text-[var(--muted)]">
              No code? <Link to="/request-invite">Request an invite</Link>.
            </p>
          </form>
        ) : (
          <form onSubmit={createAccount}>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              hint="For playtest reminders and password resets. Never shown publicly."
            />
            <Field
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={50}
              autoComplete="username"
              hint="Shown with any feedback you send."
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              error={passwordError}
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              error={confirmError}
            />
            <p className="mb-5 text-sm text-[var(--muted)]">
              By creating an account you agree to the <Link to="/privacy">privacy notice</Link>.
            </p>
            <button type="submit" className="btn primary w-full" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
            <button type="button" className="mt-4 w-full text-sm text-[var(--muted)] underline" onClick={() => setStep(1)}>
              Use a different code
            </button>
          </form>
        )}
      </Panel>
    </div>
  );
}
