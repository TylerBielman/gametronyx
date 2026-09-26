// Admin endpoints (DESIGN §5.9; role=admin). Thin wrappers over request().
import { request, type Slot } from './api';

export interface InviteCode {
  id: number;
  code: string;
  single_use: boolean;
  is_master: boolean;
  status: 'unused' | 'redeemed' | 'revoked' | 'master' | 'multi_use';
  note: string | null;
  redeemed_by_username: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
}

export interface InviteRequest {
  id: number;
  name: string;
  email: string;
  game_interest: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'declined';
  code: string | null;
  has_account: boolean;
  created_at: string | null;
  handled_at: string | null;
}

export interface Player {
  id: number;
  username: string;
  email: string | null;
  email_verified: boolean;
  role: string;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
  timezone: string | null;
  games_launched: number;
  feedback_count: number;
  upcoming_sessions: number;
}

export interface AdminGame {
  id: number;
  slug: string;
  name: string;
  pitch: string;
  description: string;
  art_url: string | null;
  type: 'open_playtest' | 'scheduled_playtest' | 'showcase_only';
  play_url: string | null;
  site_url: string | null;
  handoff_enabled: boolean;
  feedback_repo: string | null;
  feedback_labels: string[] | null;
  feedback_every_n_runs: number | null;
  show_on_showcase: boolean;
  status: 'active' | 'paused' | 'archived';
  sort_order: number;
}

export interface ActivityEvent {
  id: number;
  at: string | null;
  type: string;
  actor: string | null;
  subject: string | null;
  game: string | null;
  details: Record<string, unknown> | null;
}

export interface AdminSlot extends Slot {
  confirmed_count: number;
  notes: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  discord_event_id: string | null;
  discord_sync_needed: boolean;
}

export interface RosterEntry {
  signup_id: number;
  user_id: number;
  username: string;
  email: string | null;
  status: string;
  position: number | null;
  remind_4h: boolean;
  created_at: string | null;
  join_sent_at: string | null;
}

export interface SlotInput {
  game_slug?: string;
  starts_at?: string;
  duration_min?: number;
  capacity?: number;
  discord_channel_id?: string | null;
  discord_channel_name?: string | null;
  notes?: string | null;
  status?: 'open' | 'draft';
  repeat_weeks?: number;
}

export interface Settings {
  discord_server_id: string | null;
  discord_invite_url: string | null;
  default_slot_minutes: number;
  default_slot_seats: number;
  alert_invite_request: boolean;
  alert_playtest_signup: boolean;
  alert_playtest_cancel: boolean;
  discord_bot_configured: boolean;
  email_configured: boolean;
  github_configured: boolean;
}

type T = string;

export const admin = {
  activity: (t: T, type?: string, beforeId?: number) => {
    const q = new URLSearchParams();
    if (type) q.set('type', type);
    if (beforeId) q.set('before_id', String(beforeId));
    return request<ActivityEvent[]>(`/admin/activity?${q}`, { token: t });
  },
  activityTypes: (t: T) => request<string[]>('/admin/activity/types', { token: t }),

  players: (t: T, q = '') => request<Player[]>(`/admin/players?q=${encodeURIComponent(q)}`, { token: t }),
  editPlayer: (t: T, id: number, patch: Partial<Pick<Player, 'email' | 'is_active' | 'role'>>) =>
    request<Player>(`/admin/players/${id}`, { method: 'PATCH', json: patch, token: t }),
  tempPassword: (t: T, id: number, password: string) =>
    request<Player>(`/admin/players/${id}/password`, { json: { password }, token: t }),
  forceLogout: (t: T, id: number) => request<Player>(`/admin/players/${id}/logout`, { method: 'POST', token: t }),
  deletePlayer: (t: T, id: number, confirm: string) =>
    request<{ ok: boolean }>(`/admin/players/${id}?confirm=${encodeURIComponent(confirm)}`, { method: 'DELETE', token: t }),

  codes: (t: T) => request<InviteCode[]>('/admin/invite-codes', { token: t }),
  mint: (t: T, count: number, note: string) =>
    request<InviteCode[]>('/admin/invite-codes', { json: { count, note: note || null }, token: t }),
  revoke: (t: T, id: number) => request<InviteCode>(`/admin/invite-codes/${id}/revoke`, { method: 'POST', token: t }),
  rotateMaster: (t: T, code: string) =>
    request<InviteCode>('/admin/invite-codes/master', { json: code ? { code } : {}, token: t }),

  requests: (t: T) => request<InviteRequest[]>('/admin/invite-requests', { token: t }),
  approve: (t: T, id: number) => request<InviteRequest>(`/admin/invite-requests/${id}/approve`, { method: 'POST', token: t }),
  decline: (t: T, id: number) => request<InviteRequest>(`/admin/invite-requests/${id}/decline`, { method: 'POST', token: t }),

  games: (t: T) => request<AdminGame[]>('/admin/games', { token: t }),
  createGame: (t: T, game: Partial<AdminGame>) => request<AdminGame>('/admin/games', { json: game, token: t }),
  editGame: (t: T, id: number, game: Partial<AdminGame>) =>
    request<AdminGame>(`/admin/games/${id}`, { method: 'PATCH', json: game, token: t }),

  slots: (t: T, when: 'upcoming' | 'past' = 'upcoming') => request<AdminSlot[]>(`/admin/playtests/slots?when=${when}`, { token: t }),
  createSlots: (t: T, input: SlotInput) => request<AdminSlot[]>('/admin/playtests/slots', { json: input, token: t }),
  editSlot: (t: T, id: number, input: SlotInput) =>
    request<AdminSlot>(`/admin/playtests/slots/${id}`, { method: 'PATCH', json: input, token: t }),
  cancelSlot: (t: T, id: number) => request<AdminSlot>(`/admin/playtests/slots/${id}/cancel`, { method: 'POST', token: t }),
  roster: (t: T, id: number) => request<RosterEntry[]>(`/admin/playtests/slots/${id}/roster`, { token: t }),
  rosterAdd: (t: T, id: number, username: string) =>
    request<RosterEntry[]>(`/admin/playtests/slots/${id}/roster`, { json: { username }, token: t }),
  rosterRemove: (t: T, id: number, signupId: number) =>
    request<RosterEntry[]>(`/admin/playtests/slots/${id}/roster/${signupId}`, { method: 'DELETE', token: t }),
  channels: (t: T) => request<{ id: string; name: string }[]>('/admin/discord/channels', { token: t }),

  settings: (t: T) => request<Settings>('/admin/settings', { token: t }),
  saveSettings: (t: T, values: Partial<Settings>) => request<Settings>('/admin/settings', { method: 'PUT', json: values, token: t }),
};

/** Local wall time for <input type="datetime-local"> from an ISO instant. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO instant (with offset) from a datetime-local value in the browser's zone. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
