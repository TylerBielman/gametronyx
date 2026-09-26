import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RequireAuth from '../src/components/RequireAuth';
import AddEmail from '../src/pages/AddEmail';
import Join from '../src/pages/Join';
import Login from '../src/pages/Login';
import Reset from '../src/pages/Reset';
import { TOKEN_KEY } from '../src/lib/storage';
import { mockApi, PLAYER, renderAt } from './helpers';

const Protected = () => <p>protected page</p>;

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('join', () => {
  it('shows a generic message for a bad code and never says why', async () => {
    mockApi([{ method: 'POST', path: '/auth/invite/check', status: 400, body: { detail: 'Invite code already used' } }]);
    renderAt('/join', <Route path="/join" element={<Join />} />);
    await userEvent.type(screen.getByLabelText('Invite code'), 'used1234');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("That code isn't valid");
    expect(screen.queryByText(/already used/i)).toBeNull();
  });

  it('prefills the code from an invite link and creates the account', async () => {
    window.history.replaceState(null, '', '/join#code=abcd1234');
    const fetch = mockApi([
      { method: 'POST', path: '/auth/invite/check', body: { ok: true } },
      { method: 'POST', path: '/auth/register', status: 201, body: { access_token: 'new-token' } },
      { path: '/auth/me', body: PLAYER },
    ]);
    renderAt('/join', <Route path="/join" element={<Join />} />);
    const code = screen.getByLabelText('Invite code');
    await waitFor(() => expect(code).toHaveValue('ABCD1234'));
    expect(window.location.hash).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.test');
    await userEvent.type(screen.getByLabelText('Username'), 'Ada');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Password'), 'enough!');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'shortenough!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/play'));
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
    const registerCall = fetch.mock.calls.find(([url]) => String(url).endsWith('/auth/register'))!;
    const sent = JSON.parse(String((registerCall[1] as RequestInit).body));
    expect(sent).toMatchObject({ invite_code: 'ABCD1234', username: 'Ada', email: 'ada@example.test', password: 'shortenough!' });
    expect(sent).toHaveProperty('timezone');
  });
});

describe('login and the add-email step', () => {
  it('sends a NEWU account without email to add one, then on to the page it wanted', async () => {
    const newu = { ...PLAYER, email: null, email_verified: false, needs_email: true, timezone: 'UTC' };
    mockApi([
      { method: 'POST', path: '/auth/login', body: { access_token: 'tok' } },
      { path: '/auth/me', body: newu },
      { method: 'PATCH', path: '/auth/me', body: { ...newu, email: 'vet@example.test', needs_email: false } },
    ]);
    renderAt(
      '/login?next=%2Fme',
      <>
        <Route path="/login" element={<Login />} />
        <Route
          path="/add-email"
          element={
            <RequireAuth allowMissingEmail>
              <AddEmail />
            </RequireAuth>
          }
        />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <Protected />
            </RequireAuth>
          }
        />
      </>,
    );
    await userEvent.type(screen.getByLabelText('Username or email'), 'Veteran');
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Add your email' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'vet@example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('protected page')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/me');
  });

  it('explains a wrong password without leaking which part was wrong', async () => {
    mockApi([{ method: 'POST', path: '/auth/login', status: 401, body: { detail: 'Incorrect username or password' } }]);
    renderAt('/login', <Route path="/login" element={<Login />} />);
    await userEvent.type(screen.getByLabelText('Username or email'), 'Ada');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That username or password is wrong.');
  });

  it('bounces logged-out visitors to login with a return path', async () => {
    renderAt(
      '/me',
      <>
        <Route path="/login" element={<Login />} />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <Protected />
            </RequireAuth>
          }
        />
      </>,
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fme');
  });
});

describe('password reset', () => {
  it('uses the fragment token, strips it, and logs the player in', async () => {
    window.history.replaceState(null, '', '/reset#token=reset-abc');
    const fetch = mockApi([
      { method: 'POST', path: '/auth/reset/confirm', body: { access_token: 'fresh' } },
      { path: '/auth/me', body: PLAYER },
    ]);
    renderAt('/reset', <Route path="/reset" element={<Reset />} />);
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe(''));
    await userEvent.type(screen.getByLabelText('New password'), 'brand-new-pw');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'brand-new-pw');
    await userEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/play'));
    const confirm = fetch.mock.calls.find(([url]) => String(url).endsWith('/auth/reset/confirm'))!;
    expect(JSON.parse(String((confirm[1] as RequestInit).body))).toEqual({ token: 'reset-abc', password: 'brand-new-pw' });
  });

  it('picks up a link pasted into a tab already on /reset (fragment-only navigation)', async () => {
    renderAt(
      '/reset',
      <Route
        path="/reset"
        element={
          <>
            <Link to="/reset#token=pasted-token">open link</Link>
            <Reset />
          </>
        }
      />,
    );
    expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
    await userEvent.click(screen.getByText('open link'));
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
  });

  it('asks for an email when there is no token', () => {
    renderAt('/reset', <Route path="/reset" element={<Reset />} />);
    expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
  });
});
