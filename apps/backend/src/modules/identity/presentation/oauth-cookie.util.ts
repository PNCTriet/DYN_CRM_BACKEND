/** Cookie helpers for OAuth PKCE bag (no cookie-parser dependency). */

export const OAUTH_PKCE_COOKIE = 'dyn_oauth_pkce';

export interface OAuthPkceCookiePayload {
  feRedirect: string;
  pkceStorage: Record<string, string>;
}

export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

export function encodeOAuthPkceCookie(payload: OAuthPkceCookiePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeOAuthPkceCookie(
  value: string | undefined,
): OAuthPkceCookiePayload | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as OAuthPkceCookiePayload;
    if (!parsed?.feRedirect || typeof parsed.pkceStorage !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildSetCookie(
  name: string,
  value: string,
  opts: { maxAgeSec: number; path: string; secure?: boolean },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAgeSec}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearCookie(name: string, path: string): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax`;
}
