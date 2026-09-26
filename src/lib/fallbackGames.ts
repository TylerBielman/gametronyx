import type { Game } from './api';

// Shown if the API can't be reached, so the public showcase never renders
// empty. Mirrors the games seeded by migration 0006; admin edits (M6) only
// show up once the API answers.
export const FALLBACK_GAMES: Game[] = [
  {
    slug: 'jerboa',
    name: 'Jerboa',
    pitch:
      'Build runway for a curious jerboa, collect points, and tap him to reverse before the closing Ring catches him.',
    description: '',
    art_url: null,
    type: 'open_playtest',
    site_url: null,
    launchable: true,
  },
  {
    slug: 'no-easy-way-up',
    name: 'No Easy Way Up',
    pitch:
      'A single-player deckbuilding battler about building a combat style over a short run of authored encounters.',
    description: '',
    art_url: null,
    type: 'open_playtest',
    site_url: 'https://noeasywayup.com/',
    launchable: true,
  },
  {
    slug: 'red-ring',
    name: 'Red Ring',
    pitch: 'Multiplayer playtests, scheduled on Gametronyx and played together on Discord.',
    description: '',
    art_url: null,
    type: 'scheduled_playtest',
    site_url: null,
    launchable: false,
  },
];
