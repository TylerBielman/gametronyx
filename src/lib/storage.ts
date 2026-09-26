// localStorage can throw (private mode, blocked storage); never let it break the page.

export const TOKEN_KEY = 'gtx_auth_token_v1';

export function loadToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* session-only login is fine */
  }
}
