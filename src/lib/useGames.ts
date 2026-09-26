import { useEffect, useState } from 'react';
import { api, type Game } from './api';
import { FALLBACK_GAMES } from './fallbackGames';

/** Games from the API, falling back to the seeded list if it's unreachable. */
export function useGames(): { games: Game[]; loading: boolean; fromFallback: boolean } {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFallback, setFromFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .games()
      .then((list) => {
        if (!cancelled) setGames(list);
      })
      .catch(() => {
        if (!cancelled) {
          setGames(FALLBACK_GAMES);
          setFromFallback(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { games, loading, fromFallback };
}
