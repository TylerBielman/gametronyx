// Tokens and codes arrive in the URL fragment (/reset#token=…, /join#code=…)
// so they never reach a server log. Read them once, then strip the fragment
// so they don't linger in the address bar or history.

export function readHashParam(name: string, hash: string = window.location.hash): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const value = params.get(name);
  return value && value.trim() ? value.trim() : null;
}

export function clearHash(): void {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', pathname + search);
}
