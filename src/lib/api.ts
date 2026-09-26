// Client for the shared player-accounts API (DESIGN §5.9).

const configured = import.meta.env.VITE_API_BASE as string | undefined;
export const API_BASE = (configured ?? 'https://api.gametronyx.com').replace(/\/$/, '');

export type GameType = 'open_playtest' | 'scheduled_playtest' | 'showcase_only';

export interface Game {
  slug: string;
  name: string;
  pitch: string;
  description: string;
  art_url: string | null;
  type: GameType;
  site_url: string | null;
  launchable: boolean;
}

export interface User {
  id: number;
  username: string;
  created_at: string | null;
  email: string | null;
  email_verified: boolean;
  needs_email: boolean;
  role: 'player' | 'admin' | string;
  timezone: string | null;
  reminder_default: boolean;
}

export interface RegisterInput {
  invite_code: string;
  username: string;
  password: string;
  email: string;
  timezone?: string | null;
}

export interface MySignup {
  id: number;
  status: 'confirmed' | 'waitlisted';
  position: number | null;
  remind_4h: boolean;
}

export interface Slot {
  id: number;
  game_slug: string;
  game_name: string;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  capacity: number;
  seats_left: number;
  waitlist_count: number;
  status: string;
  my_signup: MySignup | null;
}

export interface JoinInfo {
  invite_url: string | null;
  channel_name: string | null;
  channel_url: string | null;
  notes: string | null;
}

export interface MySession {
  signup: MySignup;
  slot: Slot;
  join: JoinInfo | null;
}

export interface InviteRequestInput {
  name: string;
  email: string;
  game_interest?: string;
  message?: string;
  website?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const OFFLINE_MESSAGE =
  "Can't reach the Gametronyx server right now. Check your connection and try again.";

function detailOf(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    // FastAPI validation errors: [{loc, msg, ...}]
    if (Array.isArray(detail) && detail[0] && typeof detail[0].msg === 'string') {
      return String(detail[0].msg).replace(/^Value error, /, '');
    }
  }
  if (status === 429) return 'Too many attempts. Wait a bit and try again.';
  return `Something went wrong (${status}). Please try again.`;
}

interface RequestOptions {
  method?: string;
  json?: unknown;
  form?: Record<string, string>;
  token?: string | null;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(opts.form).toString();
  }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/api${path}`, {
      method: opts.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  }
  const text = await resp.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!resp.ok) throw new ApiError(resp.status, detailOf(parsed, resp.status));
  return parsed as T;
}

interface TokenResponse {
  access_token: string;
}

export const api = {
  games: () => request<Game[]>('/games'),
  requestInvite: (input: InviteRequestInput) =>
    request<{ ok: boolean }>('/invite-requests', { json: input }),
  inviteCheck: (invite_code: string) =>
    request<{ ok: boolean }>('/auth/invite/check', { json: { invite_code } }),
  register: async (input: RegisterInput) =>
    (await request<TokenResponse>('/auth/register', { json: input })).access_token,
  login: async (username: string, password: string) =>
    (await request<TokenResponse>('/auth/login', { form: { username, password } })).access_token,
  me: (token: string) => request<User>('/auth/me', { token }),
  updateMe: (token: string, patch: Partial<Pick<User, 'email' | 'timezone' | 'reminder_default'>>) =>
    request<User>('/auth/me', { method: 'PATCH', json: patch, token }),
  changePassword: async (token: string, current_password: string, new_password: string) =>
    (
      await request<TokenResponse>('/auth/me/password', {
        json: { current_password, new_password },
        token,
      })
    ).access_token,
  verifyEmail: (verifyToken: string) =>
    request<{ ok: boolean; email: string }>('/auth/email/verify', { json: { token: verifyToken } }),
  resendVerification: (token: string) =>
    request<{ ok: boolean }>('/auth/email/verify/resend', { method: 'POST', token }),
  requestReset: (email: string) => request<{ ok: boolean }>('/auth/reset/request', { json: { email } }),
  confirmReset: async (resetToken: string, password: string) =>
    (await request<TokenResponse>('/auth/reset/confirm', { json: { token: resetToken, password } }))
      .access_token,
  slots: (token: string) => request<Slot[]>('/playtests/slots', { token }),
  signUp: (token: string, slotId: number, remind_4h: boolean) =>
    request<MySession>(`/playtests/slots/${slotId}/signup`, { json: { remind_4h }, token }),
  leave: (token: string, slotId: number) =>
    request<{ ok: boolean }>(`/playtests/slots/${slotId}/signup`, { method: 'DELETE', token }),
  setReminder: (token: string, signupId: number, remind_4h: boolean) =>
    request<MySession>(`/playtests/signups/${signupId}`, { method: 'PATCH', json: { remind_4h }, token }),
  mySessions: (token: string) => request<MySession[]>('/playtests/me', { token }),
  handoff: (token: string, game_slug: string) =>
    request<{ code: string; expires_in: number; launch_url: string }>('/auth/handoff', {
      json: { game_slug },
      token,
    }),
};

export function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
