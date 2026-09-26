import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RequireAdmin from '../src/components/RequireAdmin';
import AdminLayout from '../src/pages/admin/AdminLayout';
import Codes from '../src/pages/admin/Codes';
import Requests from '../src/pages/admin/Requests';
import Slots from '../src/pages/admin/Slots';
import { TOKEN_KEY } from '../src/lib/storage';
import { mockApi, PLAYER, renderAt } from './helpers';

const ADMIN = { ...PLAYER, username: 'tyler', role: 'admin' };
const wrap = (path: string, el: ReactElement) => (
  <Route
    path="/admin"
    element={
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    }
  >
    <Route path={path} element={el} />
  </Route>
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(TOKEN_KEY, 'tok');
});
afterEach(() => vi.unstubAllGlobals());

describe('admin', () => {
  it('keeps players out', async () => {
    mockApi([{ path: '/auth/me', body: PLAYER }]);
    renderAt('/admin/requests', wrap('requests', <Requests />));
    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
  });

  it('approves an invite request', async () => {
    const pending = { id: 3, name: 'Sam', email: 'sam@example.test', game_interest: 'Red Ring', message: 'Hi!', status: 'pending', code: null, has_account: false, created_at: null, handled_at: null };
    const fetch = mockApi([
      { path: '/auth/me', body: ADMIN },
      { path: '/admin/invite-requests', body: [pending] },
      { method: 'POST', path: '/admin/invite-requests/3/approve', body: { ...pending, status: 'approved', code: 'ABCD1234' } },
    ]);
    renderAt('/admin/requests', wrap('requests', <Requests />));
    expect(await screen.findByText('Hi!')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText(/Sam has been emailed a code/)).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/admin/invite-requests/3/approve'))).toBe(true);
  });

  it('shows the master code and mints one-off codes with a note', async () => {
    const fetch = mockApi([
      { path: '/auth/me', body: ADMIN },
      { path: '/admin/invite-codes', body: [{ id: 1, code: 'NOEASYWAYUP', single_use: false, is_master: true, status: 'master', note: null, redeemed_by_username: null, redeemed_at: null, revoked_at: null, created_at: null }] },
      { method: 'POST', path: '/admin/invite-codes', status: 201, body: [{ id: 2, code: 'NEWCODE1', single_use: true, is_master: false, status: 'unused', note: 'Discord crew', redeemed_by_username: null, redeemed_at: null, revoked_at: null, created_at: null }] },
    ]);
    renderAt('/admin/codes', wrap('codes', <Codes />));
    expect(await screen.findByText('NOEASYWAYUP')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('How many'));
    await userEvent.type(screen.getByLabelText('How many'), '2');
    await userEvent.type(screen.getByLabelText("Note (who they're for)"), 'Discord crew');
    await userEvent.click(screen.getByRole('button', { name: 'Mint codes' }));
    expect(await screen.findByText('NEWCODE1')).toBeInTheDocument();
    const mint = fetch.mock.calls.find(([url, init]) => String(url).endsWith('/admin/invite-codes') && (init as RequestInit).method === 'POST')!;
    expect(JSON.parse(String((mint[1] as RequestInit).body))).toEqual({ count: 2, note: 'Discord crew' });
  });

  it('creates a session from local time and falls back to a typed channel without Discord', async () => {
    const fetch = mockApi([
      { path: '/auth/me', body: ADMIN },
      { path: '/admin/playtests/slots', body: [] },
      { path: '/admin/games', body: [{ id: 3, slug: 'red-ring', name: 'Red Ring', type: 'scheduled_playtest', status: 'active' }] },
      { path: '/admin/settings', body: { default_slot_minutes: 90, default_slot_seats: 5 } },
      { path: '/admin/discord/channels', status: 503, body: { detail: "Discord isn't set up yet." } },
      { method: 'POST', path: '/admin/playtests/slots', status: 201, body: [] },
    ]);
    renderAt('/admin/slots', wrap('slots', <Slots />));
    await userEvent.click(await screen.findByRole('button', { name: 'New session' }));
    const form = screen.getByRole('heading', { name: 'New session' }).parentElement!;
    await waitFor(() => expect(within(form).getByLabelText('Seats')).toHaveValue(5));
    expect(await within(form).findByText(/Discord isn't set up yet/)).toBeInTheDocument();
    await userEvent.type(within(form).getByLabelText('Starts (your local time)'), '2030-06-01T19:00');
    await userEvent.type(within(form).getByLabelText('Voice channel name'), 'red-ring-playtest');
    await userEvent.clear(within(form).getByLabelText('Repeat weekly for N more weeks'));
    await userEvent.type(within(form).getByLabelText('Repeat weekly for N more weeks'), '2');
    await userEvent.click(within(form).getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Created 3 weekly sessions.')).toBeInTheDocument();
    const call = fetch.mock.calls.find(([url, init]) => String(url).endsWith('/admin/playtests/slots') && (init as RequestInit).method === 'POST')!;
    const body = JSON.parse(String((call[1] as RequestInit).body));
    expect(body).toMatchObject({ game_slug: 'red-ring', duration_min: 90, capacity: 5, discord_channel_name: 'red-ring-playtest', repeat_weeks: 2, status: 'open' });
    expect(body.starts_at).toBe(new Date('2030-06-01T19:00').toISOString());
  });
});
