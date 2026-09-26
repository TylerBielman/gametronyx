// Built-in cartridge art, used when a game has no art_url set in admin.
export const DEFAULT_ART: Record<string, string> = {
  jerboa: '/art/jerboa.webp',
  'no-easy-way-up': '/art/no-easy-way-up.webp',
  'red-ring': '/art/red-ring.webp',
};

// Catalogue numbers printed on each cartridge (GT-01 is the handheld itself).
export const CARTRIDGE_CODES: Record<string, string> = {
  jerboa: 'GT-02',
  'no-easy-way-up': 'GT-03',
  'red-ring': 'GT-04',
};

// Where each game runs, shown on its cartridge (DECISIONS U22). A game not
// listed here shows no platform tag.
export type Platform = 'mobile_desktop' | 'desktop';
export const PLATFORMS: Record<string, Platform> = {
  jerboa: 'mobile_desktop',
  'no-easy-way-up': 'desktop',
  'red-ring': 'desktop',
};

// Faux-Soviet lettering: plain English with Cyrillic look-alikes swapped in.
// It isn't a real language, only a look (DECISIONS U21).
const FAUX: Record<string, string> = { A: 'Д', N: 'И', O: 'Ф', R: 'Я', W: 'Ш' };

export function fauxify(text: string): string {
  return text.toUpperCase().replace(/[ANORW]/g, (c) => FAUX[c]);
}
