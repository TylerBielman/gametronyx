import { Link } from 'react-router-dom';
import GameCard from '../components/GameCard';
import { Spinner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useGames } from '../lib/useGames';

const STEPS = [
  ['Get an invite', 'Tyler sends invite codes to playtesters. No code yet? Request one and he’ll be in touch.'],
  ['Play open playtests', 'Jump into builds like Jerboa and No Easy Way Up whenever you like.'],
  ['Join scheduled sessions', 'Grab a seat for multiplayer tests like Red Ring and meet up on Discord.'],
];

export default function Showcase() {
  const { status } = useAuth();
  const { games, loading } = useGames();

  return (
    <>
      <section className="mb-14 sm:mb-20">
        <p className="kicker mb-4">Playtests by Tyler Bielman</p>
        <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-wide sm:text-7xl">
          Play it <span className="text-blood">before</span>
          <br />
          it's done.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--bone-2)]">
          Gametronyx is where invited playtesters try early builds, break things, and tell Tyler what's fun.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {status === 'authed' ? (
            <Link to="/play" className="btn primary">
              Go to your playtests
            </Link>
          ) : (
            <>
              <Link to="/join" className="btn primary">
                I have an invite code
              </Link>
              <Link to="/login" className="btn ghost">
                Log in
              </Link>
            </>
          )}
        </div>
        {status !== 'authed' && (
          <p className="mt-5 text-sm text-[var(--muted)]">
            No invite yet? <Link to="/request-invite">Request an invite</Link>.
          </p>
        )}
      </section>

      <section aria-labelledby="games-heading" className="mb-16">
        <h2 id="games-heading" className="mb-6 font-display text-2xl uppercase tracking-wide">
          Now playtesting
        </h2>
        {loading ? (
          <Spinner label="Loading games" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="how-heading" className="mb-4">
        <h2 id="how-heading" className="mb-6 font-display text-2xl uppercase tracking-wide">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="panel p-5">
              <span className="font-mono text-sm text-gold">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg uppercase tracking-wide">{title}</h3>
              <p className="mt-2 text-sm text-[var(--bone-2)]">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
