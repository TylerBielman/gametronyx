import { Link } from 'react-router-dom';
import Faux from '../components/Faux';
import GameCard from '../components/GameCard';
import Handheld from '../components/Handheld';
import { Spinner } from '../components/ui';
import type { Game } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useGames } from '../lib/useGames';

const GUEST_STEPS = [
  'Press A to request an invitation from the bureau.',
  'Got a code already? Press Start to make your account.',
  'Press B to log in. Your No Easy Way Up account already works.',
  'Insert a cartridge. Lose your high score. Tell us how it felt.',
];

const PLAYER_STEPS = [
  'Press A to pick a cartridge and play.',
  'Press B to book a seat in a scheduled multiplayer session.',
  'Every few runs a game asks how it felt. Tell us.',
];

function CartridgeAction({ game, authed }: { game: Game; authed: boolean }) {
  if (game.type === 'open_playtest') {
    return authed ? (
      <Link to="/play" className="btn primary w-full">
        Insert and play
      </Link>
    ) : (
      <Link to="/login?next=%2Fplay" className="btn primary w-full">
        Log in to play
      </Link>
    );
  }
  if (game.type === 'scheduled_playtest') {
    const path = `/schedule/${game.slug}`;
    return (
      <Link to={authed ? path : `/login?next=${encodeURIComponent(path)}`} className="btn ghost w-full">
        See sessions
      </Link>
    );
  }
  return null;
}

export default function Showcase() {
  const { status } = useAuth();
  const { games, loading } = useGames();
  const authed = status === 'authed';

  return (
    <>
      <section className="mb-12 grid items-start gap-8 sm:mb-16 md:grid-cols-[26rem_1fr]">
        {authed ? (
          <Handheld
            a={{ to: '/play', label: 'Play', prompt: 'Press A to play' }}
            b={{ to: '/schedule', label: 'Schedule', prompt: 'Press B for the schedule' }}
            start={{ to: '/me', label: 'My account', prompt: 'Start: your account' }}
          />
        ) : (
          <Handheld
            a={{ to: '/request-invite', label: 'Request invite', prompt: 'Press A to request an invite' }}
            b={{ to: '/login', label: 'Log in', prompt: 'Press B to log in' }}
            start={{ to: '/join', label: 'I have a code', prompt: 'Have a code? Press Start' }}
          />
        )}

        <div className="panel p-5 sm:p-6">
          <Faux text="Operating manual" className="font-mono text-xs tracking-[0.12em] text-fg-3" />
          <h2 className="mt-1 font-display text-2xl uppercase">Operating instructions</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {(authed ? PLAYER_STEPS : GUEST_STEPS).map((step, i) => (
              <li key={step} className="flex gap-3 text-lg leading-snug">
                <span className="font-mono text-red-text">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-fg-2">
            Gametronyx is where invited playtesters try Tyler Bielman's games early, break things, and say what's fun.
          </p>
        </div>
      </section>

      <section aria-labelledby="games-heading" className="mb-4">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="games-heading" className="font-display text-2xl uppercase">
            Cartridges
          </h2>
          <Faux text="Cartridges" className="font-mono text-xs tracking-[0.12em] text-fg-3" />
        </div>
        {loading ? (
          <Spinner label="Loading games" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <GameCard key={g.slug} game={g} action={<CartridgeAction game={g} authed={authed} />} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
