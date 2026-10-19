import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RequireAuth from '../src/components/RequireAuth';
import Play from '../src/pages/Play';
import Showcase from '../src/pages/Showcase';
import { TOKEN_KEY } from '../src/lib/storage';
import { mockApi, PLAYER, renderAt } from './helpers';

// Issue #34: picking a game must start it, not send you to pick it again on /play.
const jerboa = {
  slug: 'jerboa',
  name: 'Jerboa',
  pitch: 'Run.',
  description: '',
  art_url: null,
  type: 'open_playtest',
  site_url: null,
  launchable: true,
};
const dice = { ...jerboa, slug: 'dice-arena', name: 'Dice Arena' };
const LAUNCH = 'https://jerboa.example.test/#gtx_handoff=abc';

let assign: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
});
afterEach(() => vi.unstubAllGlobals());

const playRoute = (
  <Route
    path="/play"
    element={
      <RequireAuth>
        <Play />
      </RequireAuth>
    }
  />
);

describe('starting a game', () => {
  it('starts the game from the showcase cartridge in one press', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    const fetch = mockApi([
      { path: '/auth/me', body: PLAYER },
      { path: '/games', body: [jerboa, dice] },
      { method: 'POST', path: '/auth/handoff', body: { code: 'abc', expires_in: 60, launch_url: LAUNCH } },
    ]);
    renderAt('/', <Route path="/" element={<Showcase />} />);
    const buttons = await screen.findAllByRole('button', { name: 'Insert and play' });
    await userEvent.click(buttons[0]);
    await waitFor(() => expect(assign).toHaveBeenCalledWith(LAUNCH));
    const handoff = fetch.mock.calls.find(([url]) => String(url).endsWith('/auth/handoff'));
    expect(JSON.parse(String(handoff?.[1]?.body))).toMatchObject({ game_slug: 'jerboa' });
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('sends a logged-out player to log in, carrying the game they picked', async () => {
    mockApi([{ path: '/games', body: [jerboa] }]);
    renderAt('/', <Route path="/" element={<Showcase />} />);
    const link = await screen.findByRole('link', { name: 'Log in to play' });
    expect(link).toHaveAttribute('href', `/login?next=${encodeURIComponent('/play?launch=jerboa')}`);
  });

  it('starts the picked game straight after login, once, and drops it from the address', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    const fetch = mockApi([
      { path: '/auth/me', body: PLAYER },
      { path: '/games', body: [jerboa, dice] },
      { method: 'POST', path: '/auth/handoff', body: { code: 'abc', expires_in: 60, launch_url: LAUNCH } },
    ]);
    renderAt('/play?launch=jerboa', playRoute);
    await waitFor(() => expect(assign).toHaveBeenCalledWith(LAUNCH));
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/auth/handoff'))).toHaveLength(1);
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/play$/);
  });

  it('waits for a press on /play when no game was picked', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    const fetch = mockApi([
      { path: '/auth/me', body: PLAYER },
      { path: '/games', body: [jerboa] },
    ]);
    renderAt('/play', playRoute);
    expect(await screen.findByRole('button', { name: 'Play Jerboa' })).toBeEnabled();
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/auth/handoff'))).toBe(false);
  });
});
