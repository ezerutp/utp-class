import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui';

export type RangeView = 'week' | 'month';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortMonth = (d: Date) => cap(d.toLocaleDateString('es-PE', { month: 'short' }));

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const startOfWeek = (d: Date) => {
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
};

/** [inicio, fin) del rango que contiene `anchor`. */
export function rangeOf(view: RangeView, anchor: Date): [Date, Date] {
  if (view === 'month') {
    const s = startOfMonth(anchor);
    return [s, new Date(s.getFullYear(), s.getMonth() + 1, 1)];
  }
  const s = startOfWeek(anchor);
  return [s, new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)];
}

/** Mueve el ancla n semanas/meses. */
export function shiftAnchor(view: RangeView, anchor: Date, n: number): Date {
  return view === 'month'
    ? new Date(anchor.getFullYear(), anchor.getMonth() + n, 1)
    : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + n * 7);
}

export function rangeLabel(view: RangeView, anchor: Date): string {
  if (view === 'month') return cap(anchor.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }));
  const [s] = rangeOf('week', anchor);
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
  const left = s.getMonth() === e.getMonth() ? `${s.getDate()}` : `${s.getDate()} ${shortMonth(s)}`;
  return `${left} – ${e.getDate()} ${shortMonth(e)} ${e.getFullYear()}`;
}

/** Toggle Semana/Mes + Hoy + flechas, igual que en el Calendario. */
export function RangeNav({
  view,
  anchor,
  onView,
  onShift,
  onToday,
}: {
  view: RangeView;
  anchor: Date;
  onView: (v: RangeView) => void;
  onShift: (n: number) => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-[var(--border-strong)] bg-surface p-1">
        {(['week', 'month'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            aria-pressed={view === v}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer ${
              view === v ? 'bg-brand-600 text-white shadow-sm' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {v === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>
      <Button size="sm" variant="secondary" onClick={onToday}>
        Hoy
      </Button>
      <div className="flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-surface p-1">
        <button
          onClick={() => onShift(-1)}
          aria-label={view === 'month' ? 'Mes anterior' : 'Semana anterior'}
          className="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[132px] text-center text-[14px] font-bold">{rangeLabel(view, anchor)}</span>
        <button
          onClick={() => onShift(1)}
          aria-label={view === 'month' ? 'Mes siguiente' : 'Semana siguiente'}
          className="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
