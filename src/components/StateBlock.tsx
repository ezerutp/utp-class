import { Spinner } from './ui';

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-sm text-fg-muted">
      <Spinner />
      {label}
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-fg-muted">
      <div className="text-2xl">⚠️</div>
      {error}
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
