import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type Game } from '../lib/api';
import { useAuth } from '../lib/auth';

/**
 * Starts a game in one press: a one-time handoff code so the game can sign
 * you in (DESIGN §5.6). `autoLaunch` presses it once on mount, for players
 * who chose the game before logging in (/play?launch=<slug>, A62).
 */
export default function PlayButton({ game, label, autoLaunch = false }: { game: Game; label?: string; autoLaunch?: boolean }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launched = useRef(false);

  async function launch() {
    if (!token) return;
    launched.current = true;
    setBusy(true);
    setError(null);
    try {
      const { launch_url } = await api.handoff(token, game.slug);
      window.location.assign(launch_url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the game. Please try again.");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoLaunch && !launched.current) void launch();
  }, [autoLaunch]);

  return (
    <div className="flex w-full flex-col gap-2">
      <button type="button" className="btn primary w-full" onClick={launch} disabled={busy}>
        {busy ? 'Launching…' : (label ?? `Play ${game.name}`)}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-text">
          {error}
        </p>
      )}
    </div>
  );
}
