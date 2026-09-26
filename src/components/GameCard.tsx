import type { ReactNode } from 'react';
import type { Game } from '../lib/api';
import { CARTRIDGE_CODES, DEFAULT_ART, PLATFORMS, type Platform } from '../lib/art';
import Faux from './Faux';

const STATUS: Record<string, string> = {
  open_playtest: 'Open playtest',
  scheduled_playtest: 'Scheduled sessions',
  showcase_only: 'Coming soon',
};

function Label({ game }: { game: Game }) {
  const art = game.art_url || DEFAULT_ART[game.slug];
  if (art) {
    return (
      <img
        src={art}
        alt={`Screenshot of ${game.name}`}
        className="aspect-[16/9] w-full rounded-sm bg-char object-cover object-top"
        loading="lazy"
      />
    );
  }
  // No art yet: a blank LCD label with the name.
  return (
    <div className="lcd flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 p-4 text-center" aria-hidden="true">
      <Faux text="No label" className="font-mono text-xs tracking-[0.14em] text-lcd-dim" />
      <span className="font-pixel text-sm uppercase leading-relaxed">{game.name}</span>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.5" />
      <path d="M7 12.2h2" strokeLinecap="round" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1" />
      <path d="M6 14h4M8 11v3" strokeLinecap="round" />
    </svg>
  );
}

/** The "works on" plate: teal for anywhere, red for desktop-only. */
function PlatformTag({ platform }: { platform: Platform }) {
  const anywhere = platform === 'mobile_desktop';
  return (
    <p
      className={`inline-flex items-center gap-1.5 self-start rounded-md border-2 px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider ${
        anywhere ? 'border-teal-text text-teal-text' : 'border-red text-red-text'
      }`}
    >
      {anywhere && <PhoneIcon />}
      <MonitorIcon />
      <span>{anywhere ? 'Mobile or desktop' : 'Desktop only'}</span>
    </p>
  );
}

/** A game as a GT cartridge: grip ridges, then a paper label with the art. */
export default function GameCard({ game, action }: { game: Game; action?: ReactNode }) {
  const code = CARTRIDGE_CODES[game.slug];
  const platform = PLATFORMS[game.slug];
  return (
    <article className="flex flex-col gap-3 rounded-[10px_10px_4px_4px] bg-char-3 p-3 shadow-[0_3px_0_#11100e]">
      <div
        aria-hidden="true"
        className="h-2.5 rounded-sm"
        style={{ background: 'repeating-linear-gradient(90deg, #2d2c28 0 6px, #46453f 6px 10px)' }}
      />
      <div className="flex flex-1 flex-col gap-3 rounded-sm bg-paper p-3">
        <Label game={game} />
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl uppercase leading-tight">{game.name}</h3>
          {code && <span className="shrink-0 font-mono text-xs text-fg-3">{code}</span>}
        </div>
        {platform && <PlatformTag platform={platform} />}
        {game.pitch && <p className="flex-1 leading-snug text-fg-2">{game.pitch}</p>}
        <p className="font-mono text-xs uppercase tracking-wider text-fg-3">
          Status: <span className="text-red-text">{STATUS[game.type] ?? STATUS.showcase_only}</span>
        </p>
        {(action || game.site_url) && (
          <div className="flex flex-wrap items-center gap-4">
            {action}
            {game.site_url && (
              <a href={game.site_url} target="_blank" rel="noreferrer" className="text-sm font-bold">
                Visit site ↗
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
