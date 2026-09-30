export interface AccessTokenClaims {
  exp: number;
  iat: number;
  sub: string;
  preferred_username: string;
  name: string;
  given_name: string;
  family_name: string;
  email: string;
  roles?: string[];
  realm_access?: { roles: string[] };
}

export function decodeJwt<T = AccessTokenClaims>(token: string): T {
  const payload = token.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  // Manejar UTF-8 (nombres con acentos)
  const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function isExpired(token: string, skewSeconds = 30): boolean {
  try {
    const { exp } = decodeJwt(token);
    return Date.now() / 1000 >= exp - skewSeconds;
  } catch {
    return true;
  }
}
