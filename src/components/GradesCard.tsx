import { Clock, FileText, FlaskConical, ListChecks, MessagesSquare, type LucideIcon } from 'lucide-react';
import type { GradeItem } from '../lib/assistantTools';
import { CONTENT_LABEL } from '../lib/format';

const KIND_ICON: Record<string, LucideIcon> = {
  HOMEWORK: ListChecks,
  EVALUATION: FlaskConical,
  FORUM: MessagesSquare,
};

// Aprobatoria en escala 0-20: 10.5
const PASS = 0.525;

function ScorePill({ item }: { item: GradeItem }) {
  if (item.score == null) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
        <Clock size={11} /> Sin nota
      </span>
    );
  }
  const pass = item.score / item.top >= PASS;
  return (
    <span
      className={`inline-flex shrink-0 items-baseline gap-0.5 rounded-full px-2.5 py-0.5 text-[13px] font-bold tabular-nums ${
        pass
          ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
          : 'bg-brand-600/12 text-brand-700 dark:text-brand-300'
      }`}
    >
      {item.score}
      <span className="text-[10.5px] font-semibold opacity-60">/{item.top}</span>
    </span>
  );
}

export function GradesCard({
  avg,
  graded,
  total,
  items,
}: {
  avg: string | null;
  graded: number;
  total: number;
  items: GradeItem[];
}) {
  const pct = total ? Math.round((graded / total) * 100) : 0;
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-surface-2">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-faint">Promedio simple</div>
          <div className="mt-0.5 text-[26px] font-bold leading-none tabular-nums">{avg ?? '—'}</div>
        </div>
        <div className="w-[42%] shrink-0">
          <div className="text-right text-[11.5px] font-medium text-fg-muted">
            {graded} de {total} calificadas
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)] bg-surface">
        {items.map((it, i) => {
          const Ico = KIND_ICON[it.kind] ?? FileText;
          return (
            <li key={i} className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-300">
                <Ico size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="break-words text-[13px] font-semibold leading-snug">{it.title}</div>
                <div className="text-[11.5px] text-fg-faint">
                  {CONTENT_LABEL[it.kind] ?? it.kind} · Semana {it.week}
                </div>
              </div>
              <ScorePill item={it} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
