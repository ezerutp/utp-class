import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { createApi, makeEndpoints } from './api';

/** Hook que expone los endpoints tipados, ya autenticados con la sesion actual. */
export function useApi() {
  const { session, refresh, logout } = useAuth();
  const navigate = useNavigate();

  return useMemo(() => {
    const client = createApi({
      getSession: () => session,
      refresh,
      onAuthError: () => {
        logout();
        navigate('/login');
      },
    });
    return makeEndpoints(client, session?.userId ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId, session?.accessToken]);
}
