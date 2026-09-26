import { useState } from 'react';
import { Link } from 'react-router-dom';
import GameCard from '../components/GameCard';
import { Notice, PageHeader, Spinner } from '../components/ui';
import { api, ApiError, type Game } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useGames } from '../lib/useGames';

function PlayButton({ game }: { game: Game }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      // One-time handoff code, so the game can sign you in (DESIGN §5.6).
      const { launch_url } = await api.handoff(token, game.slug);
      window.location.assign(launch_url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the game. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button type="button" className="btn primary w-full" onClick={launch} disabled={busy}>
        {busy ? 'Launching…' : `Play ${game.name}`}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-text">
          {error}
        </p>
      )}
    </div>
  );
}

function VerifyBanner() {
  const { user, token } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user?.email || user.email_verified) return null;

  async function resend() {
    if (!token) return;
    setError(null);
    try {
      await api.resendVerification(token);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the email.');
    }
  }

  return (
    <Notice tone="info">
      Please confirm <strong>{user.email}</strong> using the link we emailed you.{' '}
      {sent ? (
        'A new link is on its way.'
      ) : (
        <button type="button" className="font-semibold text-red-text underline" onClick={resend}>
          Send it again
        </button>
      )}
      {error && <span className="ml-2 text-red-text">{error}</span>}
    </Notice>
  );
}

export default function Play() {
  const { user } = useAuth();
  const { games, loading, fromFallback } = useGames();
  const open = games.filter((g) => g.type === 'open_playtest' && g.launchable);
  const scheduled = games.filter((g) => g.type === 'scheduled_playtest');

  return (
    <>
      <PageHeader kicker={`Hi, ${user?.username ?? 'playtester'}`} title="Your playtests">
        Play the open builds as much as you like, or grab a seat in a scheduled multiplayer session.
      </PageHeader>
      <VerifyBanner />
      {fromFallback && <Notice tone="error">The game list is offline right now, so Play buttons may not work.</Notice>}
      {loading ? (
        <Spinner label="Loading games" />
      ) : (
        <>
          <section aria-labelledby="open-heading" className="mb-12">
            <h2 id="open-heading" className="mb-5 font-display text-2xl uppercase tracking-wide">
              Open playtests
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {open.map((g) => (
                <GameCard key={g.slug} game={g} action={<PlayButton game={g} />} />
              ))}
            </div>
          </section>
          {scheduled.length > 0 && (
            <section aria-labelledby="scheduled-heading">
              <h2 id="scheduled-heading" className="mb-5 font-display text-2xl uppercase tracking-wide">
                Scheduled playtests
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {scheduled.map((g) => (
                  <GameCard
                    key={g.slug}
                    game={g}
                    action={
                      <Link to={`/schedule/${g.slug}`} className="btn ghost w-full">
                        See sessions
                      </Link>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
