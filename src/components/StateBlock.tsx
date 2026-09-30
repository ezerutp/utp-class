import { Button, Spinner } from './ui';

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-sm text-fg-muted">
      <Spinner />
      {label}
    </div>
  );
}

// Mensajes crudos de axios/fetch cuando no hubo respuesta del servidor.
const NETWORK_ERRORS = new Set(['Network Error', 'Failed to fetch', 'timeout exceeded']);

export function ErrorState({ error }: { error: string }) {
  const network = NETWORK_ERRORS.has(error);
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-fg-muted">
      <div className="text-2xl">⚠️</div>
      {network ? 'No se pudo conectar con el campus. Revisa tu conexión e inténtalo de nuevo.' : error}
      {network && (
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-fg-faint">
      <div className="text-2xl opacity-60">🗂️</div>
      {label}
    </div>
  );
}
