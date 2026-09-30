import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { decodeJwt, isExpired } from './jwt';
import { uuidv5 } from './uuidv5';

export const TENANT_ID = 'a5f469d2-3c0e-5c68-8d32-5265923a8e40';
export const KEYCLOAK_CLIENT_ID = 'pao-web';
// El endpoint real es https://sso.utp.edu.pe/... ; en dev pasa por el proxy de Vite (/sso).
export const TOKEN_ENDPOINT = '/sso/auth/realms/Xpedition/protocol/openid-connect/token';

const STORAGE_KEY = 'utp.session';

export interface Session {
  accessToken: string;
  refreshToken?: string;
  userId: string; // uuidv5(email.toUpperCase())
  role: string; // p.ej. STUDENT
  email: string;
  name: string;
  username: string;
}

interface AuthState {
  session: Session | null;
  login: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  /** Refresca el access token usando el refresh token (si hay). Devuelve el nuevo token. */
  refresh: () => Promise<string>;
}

const AuthContext = createContext<AuthState | null>(null);

function roleFromClaims(roles: string[] | undefined): string {
  const known = ['student', 'teacher', 'coordinator'];
  const match = (roles ?? []).map((r) => r.toLowerCase()).find((r) => known.includes(r));
  return (match ?? 'student').toUpperCase();
}

export function sessionFromToken(accessToken: string, refreshToken?: string): Session {
  const c = decodeJwt(accessToken);
  return {
    accessToken,
    refreshToken,
    userId: uuidv5(c.email.toUpperCase()),
    role: roleFromClaims(c.roles ?? c.realm_access?.roles),
    email: c.email,
    name: c.name,
    username: c.preferred_username,
  };
}

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => load());

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const value = useMemo<AuthState>(() => {
    const login = (accessToken: string, refreshToken?: string) => {
      setSession(sessionFromToken(accessToken.trim(), refreshToken?.trim() || undefined));
    };
    const logout = () => setSession(null);

    const refresh = async (): Promise<string> => {
      const current = load();
      if (!current?.refreshToken) throw new Error('No hay refresh token disponible. Vuelve a iniciar sesion.');
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: KEYCLOAK_CLIENT_ID,
        refresh_token: current.refreshToken,
      });
      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error(`Refresh fallo (${res.status})`);
      const json = await res.json();
      const next = sessionFromToken(json.access_token, json.refresh_token ?? current.refreshToken);
      setSession(next);
      return next.accessToken;
    };

    return { session, login, logout, refresh };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export { isExpired };
