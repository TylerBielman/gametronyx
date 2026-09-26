import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RequireAuth from '../src/components/RequireAuth';
import Me from '../src/pages/Me';
import { GameSchedule } from '../src/pages/Schedule';
import { TOKEN_KEY } from '../src/lib/storage';
import { mockApi, PLAYER, renderAt } from './helpers';

const iso = (h: number) => new Date(Date.UTC(2030, 5, 1, h)).toISOString();
const slot = (id: number, extra = {}) => ({
  id,
  game_slug: 'red-ring',
  game_name: 'Red Ring',
  starts_at: iso(18 + id),
  ends_at: iso(19 + id),
  duration_min: 60,
  capacity: 4,
  seats_left: 2,
  waitlist_count: 0,
  status: 'open',
  my_signup: null,
  ...extra,
});
const games = [{ slug: 'red-ring', name: 'Red Ring', pitch: 'Multiplayer.', description: '', art_url: null, type: 'scheduled_playtest', site_url: null, launchable: false }];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(TOKEN_KEY, 'tok');
});
afterEach(() => vi.unstubAllGlobals());

const scheduleRoute = (
  <Route
    path="/schedule/:slug"
    element={
      <RequireAuth>
        <GameSchedule />
      </RequireAuth>
    }
  />
);

describe('game schedule', () => {
  it('lists sessions with seats and signs up with the reminder opt-in unchecked', async () => {
    const fetch = mockApi([
      { path: '/auth/me', body: PLAYER },
      { path: '/games', body: games },
      { path: '/playtests/slots', body: [slot(1), slot(2, { seats_left: 0, waitlist_count: 3 })] },
      {
        method: 'POST',
        path: '/playtests/slots/1/signup',
        body: { signup: { id: 7, status: 'confirmed', position: null, remind_4h: true }, slot: slot(1), join: null },
      },
    ]);
    renderAt('/schedule/red-ring', scheduleRoute);
    expect(await screen.findByText('2 of 4 seats left')).toBeInTheDocument();
    expect(screen.getByText('Full · waitlist (3 ahead)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join waitlist' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    const dialog = await screen.findByRole('dialog', { name: 'Grab this seat?' });
    const box = within(dialog).getByRole('checkbox', { name: 'Email me a reminder 4 hours before' });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText(/You're in!/)).toBeInTheDocument();
    const call = fetch.mock.calls.find(([url]) => String(url).endsWith('/playtests/slots/1/signup'))!;
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ remind_4h: true });
  });

  it('shows your seat and waitlist place instead of a sign-up button', async () => {
    mockApi([
      { path: '/auth/me', body: PLAYER },
      { path: '/games', body: games },
      {
        path: '/playtests/slots',
        body: [
          slot(1, { my_signup: { id: 1, status: 'confirmed', position: null, remind_4h: false } }),
          slot(2, { seats_left: 0, my_signup: { id: 2, status: 'waitlisted', position: 2, remind_4h: false } }),
        ],
      },
    ]);
    renderAt('/schedule/red-ring', scheduleRoute);
    expect(await screen.findByRole('link', { name: "You're in ✓" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Waitlist #2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull();
  });

  it('says so when nothing is scheduled', async () => {
    mockApi([
      { path: '/auth/me', body: PLAYER },
      { path: '/games', body: games },
      { path: '/playtests/slots', body: [] },
    ]);
    renderAt('/schedule/red-ring', scheduleRoute);
    expect(await screen.findByText(/No sessions scheduled yet/)).toBeInTheDocument();
  });
});

describe('my sessions', () => {
  const meRoute = (
    <Route
      path="/me"
      element={
        <RequireAuth>
          <Me />
        </RequireAuth>
      }
    />
  );

  it('shows the Discord join panel when it is close to start, and cancels a seat', async () => {
    const fetch = mockApi([
      { path: '/auth/me', body: PLAYER },
      {
        path: '/playtests/me',
        body: [
          {
            signup: { id: 5, status: 'confirmed', position: null, remind_4h: false },
            slot: slot(1),
            join: {
              invite_url: 'https://discord.gg/abc',
              channel_name: 'red-ring-playtest',
              channel_url: 'https://discord.com/channels/1/2',
              notes: 'Bring headphones.',
            },
          },
        ],
      },
      { method: 'DELETE', path: '/playtests/slots/1/signup', body: { ok: true } },
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAt('/me', meRoute);
    expect(await screen.findByText('Starting soon: join on Discord')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join the Gametronyx Discord' })).toHaveAttribute('href', 'https://discord.gg/abc');
    expect(screen.getByRole('link', { name: '#red-ring-playtest' })).toHaveAttribute('href', 'https://discord.com/channels/1/2');
    expect(screen.getByText('Bring headphones.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel my seat' }));
    await waitFor(() =>
      expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/playtests/slots/1/signup') && (init as RequestInit).method === 'DELETE')).toBe(true),
    );
    expect(await screen.findByText(/Seat released/)).toBeInTheDocument();
  });

  it('points to the schedule when there are no sessions', async () => {
    mockApi([
      { path: '/auth/me', body: PLAYER },
      { path: '/playtests/me', body: [] },
    ]);
    renderAt('/me', meRoute);
    expect(await screen.findByRole('link', { name: 'Find a scheduled playtest' })).toHaveAttribute('href', '/schedule');
  });
});
