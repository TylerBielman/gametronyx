import type { ReactNode } from 'react';
import type { Game } from '../lib/api';

const BADGES: Record<string, { label: string; className: string }> = {
  open_playtest: { label: 'Open playtest', className: 'bg-cash text-ink' },
  scheduled_playtest: { label: 'Scheduled playtests', className: 'bg-gold text-ink' },
  showcase_only: { label: 'Coming soon', className: 'bg-ink-3 text-bone' },
};

function Art({ game }: { game: Game }) {
  if (game.art_url) {
    return <img src={game.art_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />;
  }
  // No art yet: a typographic band in the house style.
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[5/2] w-full items-end overflow-hidden bg-ink-3 p-4"
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(242,235,219,0.04) 0 12px, transparent 12px 24px), radial-gradient(circle at 80% 20%, rgba(194,57,46,0.35), transparent 55%)',
      }}
    >
      {/* Colors are CSS variables, so Tailwind's /opacity modifier can't apply. */}
      <span className="font-display text-4xl uppercase leading-none sm:text-5xl" style={{ color: 'rgba(242,235,219,0.14)' }}>
        {game.name}
      </span>
    </div>
  );
}

export default function GameCard({ game, action }: { game: Game; action?: ReactNode }) {
  const badge = BADGES[game.type] ?? BADGES.showcase_only;
  return (
    <article className="panel flex flex-col">
      <Art game={game} />
      <div className="flex flex-1 flex-col p-5">
        <span className={`mb-3 self-start px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest ${badge.className}`}>
          {badge.label}
        </span>
        <h3 className="font-display text-xl uppercase tracking-wide">{game.name}</h3>
        {game.pitch && <p className="mt-2 flex-1 text-[var(--bone-2)]">{game.pitch}</p>}
        {(action || game.site_url) && (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {action}
            {game.site_url && (
              <a href={game.site_url} target="_blank" rel="noreferrer" className="text-sm font-semibold">
                Visit site ↗
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
