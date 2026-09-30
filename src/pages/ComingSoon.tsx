import { Construction } from 'lucide-react';

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border-strong)] py-20 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-fg-faint">
          <Construction size={26} />
        </div>
        <div>
          <p className="font-semibold">En construcción</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
            {description ??
              'Esta sección aún no está conectada. El endpoint ya está identificado; la vista llega pronto.'}
          </p>
        </div>
      </div>
    </div>
  );
}
