import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Notice, PageHeader, Panel, Spinner } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useHashParam } from '../lib/useHashParam';

export default function VerifyEmail() {
  const { status, user, token, setUser } = useAuth();
  const verifyToken = useHashParam('token');
  const [state, setState] = useState<'working' | 'done' | 'failed'>(verifyToken ? 'working' : 'failed');
  const [message, setMessage] = useState<string>('This confirmation link is missing its code.');
  const [email, setEmail] = useState<string | null>(null);
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!verifyToken || attempted.current === verifyToken) return;
    attempted.current = verifyToken; // StrictMode runs effects twice in dev
    setState('working');
    api
      .verifyEmail(verifyToken)
      .then((r) => {
        setEmail(r.email);
        setState('done');
      })
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        setState('failed');
      });
  }, [verifyToken]);

  // Refresh the header's view of the account once confirmed.
  useEffect(() => {
    if (state === 'done' && token && user && !user.email_verified) {
      api.me(token).then(setUser).catch(() => {});
    }
  }, [state, token, user, setUser]);

  if (state === 'working') return <Spinner label="Confirming your email" />;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="Email" title={state === 'done' ? 'Email confirmed' : "Couldn't confirm"} />
      <Panel>
        {state === 'done' ? (
          <Notice tone="success">
            Thanks! <strong>{email}</strong> is confirmed.
          </Notice>
        ) : (
          <Notice tone="error">{message}</Notice>
        )}
        {status === 'authed' ? (
          <Link to={state === 'done' ? '/play' : '/me'} className="btn primary">
            {state === 'done' ? 'Go to your playtests' : 'Send a new link'}
          </Link>
        ) : (
          <Link to="/login" className="btn primary">
            Log in
          </Link>
        )}
      </Panel>
    </div>
  );
}
