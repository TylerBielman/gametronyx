import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fauxify } from '../lib/art';
import Faux from './Faux';

export interface Key {
  to: string;
  label: string;
  /** What the LCD tells the player to press this key for. */
  prompt: string;
}

function Prompt({ glyph, children }: { glyph: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lcd-ink text-[9px] text-lcd">
        {glyph}
      </span>
      <span>{children}</span>
    </li>
  );
}

function DPad() {
  return (
    <div aria-hidden="true" className="relative mb-8 h-16 w-16 shrink-0">
      <div className="absolute left-[21px] top-0 h-16 w-[22px] rounded bg-char-2" />
      <div className="absolute left-0 top-[21px] h-[22px] w-16 rounded bg-char-2" />
    </div>
  );
}

/**
 * The GT-01: the home page hero. A and B (and Start) are the real actions,
 * and the LCD spells out which key does what.
 */
export default function Handheld({ a, b, start }: { a: Key; b: Key; start?: Key }) {
  return (
    <div className="mx-auto w-full max-w-[26rem] rounded-[22px_22px_22px_56px] bg-casing p-4 shadow-[0_3px_0_var(--line),inset_0_1px_0_#f6f2e6]">
      <div className="flex items-center justify-between">
        <Faux text="Model GT-01" className="font-mono text-xs tracking-[0.12em] text-fg-3" />
        <div className="stripe w-28" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-char-2 p-3.5">
        <div className="lcd flex flex-col gap-2.5 px-3 py-3.5">
          <div aria-hidden="true" className="flex justify-between font-pixel text-[9px]">
            <span>{fauxify('Hi-score')}</span>
            <span>{fauxify('Round 01')}</span>
          </div>
          <div aria-hidden="true" className="text-center font-pixel text-[28px] tracking-[0.06em] sm:text-[30px]">
            000000
          </div>
          <h1 className="text-center font-pixel text-[11px] uppercase leading-[1.8]">
            We kill your
            <br />
            high score
            <br />
            in the face!
          </h1>
          <div aria-hidden="true" className="h-0.5 bg-[#6f7d57]" />
          <ul className="flex flex-col gap-2 font-pixel text-[9px] uppercase leading-snug" aria-label="Controls">
            <Prompt glyph="A">{a.prompt}</Prompt>
            <Prompt glyph="B">{b.prompt}</Prompt>
            {start && <Prompt glyph="▶">{start.prompt}</Prompt>}
          </ul>
        </div>
      </div>

      <img src="/brand/gametronyx-logo.webp" alt="Gametronyx" width={1200} height={224} className="mx-auto mt-3 block w-full" />

      <div className="mt-2 flex items-end justify-between px-1">
        <DPad />
        <div className="flex items-end gap-3">
          <Link to={b.to} className="group flex flex-col items-center gap-2 text-fg no-underline">
            <span
              aria-hidden="true"
              className="grid h-16 w-16 place-items-center rounded-full bg-[#6f6a5d] font-display text-3xl text-paper shadow-[0_4px_0_#454137] transition-transform group-active:translate-y-1 group-active:shadow-none"
            >
              B
            </span>
            <span className="rounded-xl bg-char px-3 py-1.5 font-display text-[15px] uppercase tracking-wide text-fg-inverse">
              {b.label}
            </span>
          </Link>
          <Link to={a.to} className="group mb-7 flex flex-col items-center gap-2 text-fg no-underline">
            <span
              aria-hidden="true"
              className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[var(--red-key)] font-display text-4xl text-[#fff8ec] shadow-[0_4px_0_#8e2a12,0_0_0_4px_var(--amber)] transition-transform group-active:translate-y-1"
            >
              A
            </span>
            <span className="rounded-xl bg-red px-3 py-1.5 font-display text-[15px] uppercase tracking-wide text-[#fff8ec]">
              {a.label}
            </span>
          </Link>
        </div>
      </div>

      {start && (
        <div className="mt-5 flex justify-center pb-1">
          <Link to={start.to} className="group flex flex-col items-center gap-1.5 text-fg no-underline">
            <span
              aria-hidden="true"
              className="block h-4 w-14 -rotate-[18deg] rounded-full bg-[#6f6a5d] shadow-[0_3px_0_#454137] transition-transform group-active:translate-y-0.5"
            />
            <span className="font-mono text-[11px] tracking-[0.16em] text-fg-3" aria-hidden="true">
              START
            </span>
            <span className="rounded-xl border-2 border-char px-3 py-1 font-display text-[15px] uppercase tracking-wide">
              {start.label}
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
