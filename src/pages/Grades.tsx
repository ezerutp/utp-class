import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  FileText,
  FlaskConical,
  GraduationCap,
  Hourglass,
  ListChecks,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '../lib/useApi';
import { ErrorState, Loading } from '../components/StateBlock';
import { PeriodSelect } from '../components/PeriodSelect';
import { Button } from '../components/ui';
import { EASE_OUT } from '../lib/motion';
import { CONTENT_LABEL, fmtDate, toDate } from '../lib/format';
import { loadStoredPeriod, pickCurrentPeriod, storePeriod } from '../lib/period';
import { courseIcon } from '../lib/courseIcon';
import type { DashboardCourse, GradeRow } from '../types/api';

/* ---------- Tipos ---------- */

type StatusFilter = 'all' | 'approved' | 'failed' | 'pending';
type GradeKind = 'HOMEWORK' | 'EVALUATION' | 'FORUM';

// Aprobado en escala 0-20: 13 (mismo criterio que el detalle por curso).
const PASS = 13;
const norm20 = (g: number, top: number) => (top > 0 ? (g / top) * 20 : g);
const isGraded = (r: GradeRow) => r.gradeStatus === 'GRADED' && r.grade != null;
const isApproved = (r: GradeRow) =>
  isGraded(r) && norm20(r.grade ?? 0, r.evaluationTopScore || 20) >= PASS;

interface CourseGrades {
  courseId: string;
  sectionId: string;
  name: string;
  period: string;
  teacher: string;
  avg: number | null;
  items: GradeRow[];
}

const KIND: Record<GradeKind, { icon: LucideIcon; box: string; dot: string; plural: string }> = {
  HOMEWORK: {
    icon: ListChecks,
    box: 'bg-brand-600/12 text-brand-700 dark:text-brand-300',
    dot: 'bg-brand-600',
    plural: 'Tareas',
  },
  EVALUATION: {
    icon: FlaskConical,
    box: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    plural: 'Evaluaciones',
  },
  FORUM: {
    icon: MessagesSquare,
    box: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    plural: 'Foros',
  },
};
const KINDS: GradeKind[] = ['HOMEWORK', 'EVALUATION', 'FORUM'];

const matches = (f: StatusFilter, r: GradeRow) =>
  f === 'all' || (f === 'pending' ? !isGraded(r) : f === 'approved' ? isApproved(r) : isGraded(r) && !isApproved(r));

/* Concurrencia limitada: lanzar todas las notas a la vez hace que el API corte peticiones. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ---------- Resumen / KPIs (mismo lenguaje visual que Actividades) ---------- */

const STAT: { key: Exclude<StatusFilter, 'all'> | 'total'; label: string; icon: LucideIcon; tone: string; ring: string }[] = [
  { key: 'total', label: 'Evaluaciones', icon: ListChecks, tone: 'text-fg-muted bg-surface-2', ring: 'ring-[var(--border-strong)]' },
  { key: 'approved', label: 'Aprobadas', icon: CircleCheck, tone: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/12', ring: 'ring-emerald-500/50' },
  { key: 'failed', label: 'Desaprobadas', icon: CircleAlert, tone: 'text-brand-600 dark:text-brand-300 bg-brand-600/10', ring: 'ring-brand-600/50' },
  { key: 'pending', label: 'Por calificar', icon: Hourglass, tone: 'text-amber-600 dark:text-amber-300 bg-amber-500/12', ring: 'ring-amber-500/50' },
];

function countFor(key: StatusFilter | 'total', items: GradeRow[]): number {
  if (key === 'total') return items.length;
  return items.filter((r) => matches(key, r)).length;
}

function Summary({
  items,
  avg,
  filter,
  onFilter,
}: {
  items: GradeRow[];
  avg: number | null;
  filter: StatusFilter;
  onFilter: (f: StatusFilter) => void;
}) {
  const graded = items.filter(isGraded).length;
  const pct = items.length ? Math.round((graded / items.length) * 100) : 0;
  const pending = items.length - graded;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
      <div className="rounded-2xl border border-[var(--border)] bg-surface p-4 card-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-fg-faint">
            Promedio general
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-fg-muted">
            {graded} de {items.length}
          </span>
        </div>
        <div className="mt-2 text-[28px] font-bold leading-none tabular-nums">
          {avg != null ? avg.toFixed(1) : '—'}
          <span className="text-[14px] font-semibold text-fg-faint"> /20</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          />
        </div>
        <p className="mt-2 text-[12px] text-fg-muted">
          {items.length === 0
            ? 'Sin evaluaciones calificables en este periodo.'
            : pending === 0
              ? '¡Todo calificado! 🎉'
              : `Te faltan ${pending} ${pending === 1 ? 'nota' : 'notas'} por recibir.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT.map((s) => {
          const key = s.key === 'total' ? 'all' : s.key;
          const on = filter === key;
          const Ico = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => onFilter(on ? 'all' : key)}
              aria-pressed={on}
              className={`flex flex-col items-start rounded-2xl border border-[var(--border)] bg-surface p-3.5 text-left card-shadow transition-[transform,box-shadow] duration-150 active:scale-[0.98] cursor-pointer ${
                on ? `ring-2 ${s.ring}` : 'hover:border-[var(--border-strong)]'
              }`}
            >
              <span className={`grid size-8 place-items-center rounded-lg ${s.tone}`}>
                <Ico size={16} />
              </span>
              <span className="mt-2.5 text-[22px] font-bold leading-none tabular-nums">
                {countFor(s.key, items)}
              </span>
              <span className="mt-1 text-[12px] font-medium text-fg-muted">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Fila de nota ---------- */

function ScorePill({ r }: { r: GradeRow }) {
  if (!isGraded(r)) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted">
        Sin nota
      </span>
    );
  }
  const ok = isApproved(r);
  return (
    <span
      className={`inline-flex shrink-0 items-baseline gap-0.5 rounded-full px-2.5 py-0.5 text-[13px] font-bold tabular-nums ${
        ok
          ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
          : 'bg-brand-600/12 text-brand-700 dark:text-brand-300'
      }`}
    >
      {(r.grade ?? 0).toFixed(0)}
      <span className="text-[10.5px] font-semibold opacity-60">/{r.evaluationTopScore || 20}</span>
    </span>
  );
}

function GradeItemRow({ r }: { r: GradeRow }) {
  const k = (KIND as Record<string, (typeof KIND)[GradeKind]>)[r.type];
  const Ico = k?.icon ?? FileText;
  const box = k?.box ?? 'bg-surface-2 text-fg-muted';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isGraded(r) ? 'opacity-70' : ''}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${box}`}>
        <Ico size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{r.activityTitle}</span>
        <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12px] text-fg-muted">
          <span className="font-medium">{CONTENT_LABEL[r.type] ?? r.type}</span>
          {r.weekNumber ? (
            <>
              <span className="text-fg-faint">·</span>
              <span>Semana {r.weekNumber}</span>
            </>
          ) : null}
          {r.gradeDate && (
            <>
              <span className="text-fg-faint">·</span>
              <span className="tabular-nums">{fmtDate(r.gradeDate)}</span>
            </>
          )}
        </span>
      </span>
      <ScorePill r={r} />
    </div>
  );
}

/* ---------- Página ---------- */

export function Grades() {
  const api = useApi();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseGrades[] | null>(null);
  const [periods, setPeriods] = useState<{ period: string; name: string; start: number }[]>([]);
  const [period, setPeriod] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kinds, setKinds] = useState<Set<GradeKind>>(() => new Set(KINDS));

  useEffect(() => {
    let alive = true;
    setError('');
    (async () => {
      const [cs, ps] = await Promise.all([
        api.dashboardCourses(),
        api.academicPeriods().catch(() => ({ academicPeriods: [] as never[] })),
      ]);
      const list = (ps.academicPeriods ?? []) as { period: string; name: string; start: string; parsedStartDate: string; type: string }[];
      if (!alive) return;
      const stored = loadStoredPeriod();
      const valid = stored === 'all' || cs.some((c) => c.period === stored);
      const current = stored && valid ? stored : pickCurrentPeriod(cs, list as never);
      setPeriod(current);
      setPeriods(
        list
          .filter((p) => p.type !== 'CURRENT_PERIOD' && p.period !== '9999')
          .map((p) => ({
            period: p.period,
            name: p.name || p.period,
            start: toDate(p.start || p.parsedStartDate)?.getTime() ?? 0,
          })),
      );

      const perCourse = await mapLimit(cs, 4, async (c: DashboardCourse): Promise<CourseGrades | null> => {
        try {
          const rows = await api.grades(c.sectionId);
          const items = (rows ?? [])
            .filter((r) => r.isQualificated)
            .sort((a, b) => a.weekNumber - b.weekNumber);
          const graded = items.filter(isGraded);
          const avg = graded.length
            ? graded.reduce((s, r) => s + norm20(r.grade ?? 0, r.evaluationTopScore || 20), 0) / graded.length
            : null;
          const teacher = `${c.teacherFirstName ?? ''} ${c.teacherLastName ?? ''}`.trim();
          return { courseId: c.courseId, sectionId: c.sectionId, name: c.name, period: c.period, teacher, avg, items };
        } catch {
          return null;
        }
      });
      if (!alive) return;
      setCourses(
        (perCourse.filter(Boolean) as CourseGrades[]).sort((a, b) => a.name.localeCompare(b.name, 'es')),
      );
    })().catch((e) => alive && setError(e?.message ?? 'Error cargando las notas'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const availablePeriods = useMemo(() => {
    const names = new Map(periods.map((p) => [p.period, p.name] as const));
    const start = new Map(periods.map((p) => [p.period, p.start] as const));
    return [...new Set((courses ?? []).map((c) => c.period))]
      .sort((a, b) => (start.get(b) ?? 0) - (start.get(a) ?? 0) || a.localeCompare(b))
      .map((code) => [code, names.get(code) || code] as const);
  }, [courses, periods]);

  const inPeriod = useMemo(
    () => (courses ?? []).filter((c) => period === 'all' || period === '' || c.period === period),
    [courses, period],
  );

  const allItems = useMemo(() => inPeriod.flatMap((c) => c.items), [inPeriod]);
  const byKind = useMemo(() => allItems.filter((r) => kinds.has(r.type as GradeKind) || !KINDS.includes(r.type as GradeKind)), [allItems, kinds]);
  const generalAvg = useMemo(() => {
    const g = byKind.filter(isGraded);
    return g.length
      ? g.reduce((s, r) => s + norm20(r.grade ?? 0, r.evaluationTopScore || 20), 0) / g.length
      : null;
  }, [byKind]);

  const visibleCourses = useMemo(
    () =>
      inPeriod
        .map((c) => ({
          ...c,
          shown: c.items.filter((r) => (kinds.has(r.type as GradeKind) || !KINDS.includes(r.type as GradeKind)) && matches(status, r)),
        }))
        .filter((c) => c.shown.length > 0),
    [inPeriod, kinds, status],
  );

  if (!courses) return <Loading label="Juntando tus notas…" />;
  if (error) return <ErrorState error={error} />;

  const currentName = availablePeriods.find(([c]) => c === period)?.[1];
  const toggleKind = (k: GradeKind) =>
    setKinds((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calificaciones</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {inPeriod.length} {inPeriod.length === 1 ? 'curso' : 'cursos'}
            {currentName && period !== 'all' ? ` · ${currentName}` : ''}
          </p>
        </div>
        {availablePeriods.length > 0 && (
          <PeriodSelect
            value={period}
            options={availablePeriods}
            onChange={(p) => {
              setPeriod(p);
              storePeriod(p);
            }}
          />
        )}
      </div>

      <div className="mt-5">
        <Summary items={byKind} avg={generalAvg} filter={status} onFilter={setStatus} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => {
          const on = kinds.has(k);
          return (
            <button
              key={k}
              onClick={() => toggleKind(k)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-[background-color,opacity,transform] duration-150 active:scale-95 cursor-pointer ${
                on ? 'border-[var(--border-strong)] bg-surface' : 'border-[var(--border)] bg-transparent text-fg-faint opacity-60'
              }`}
            >
              <span className={`size-2.5 rounded-full ${KIND[k].dot}`} />
              {KIND[k].plural}
              <span className="rounded-full bg-surface-2 px-1.5 text-[11px] tabular-nums text-fg-muted">
                {allItems.filter((r) => r.type === k).length}
              </span>
            </button>
          );
        })}
        {status !== 'all' && (
          <button
            onClick={() => setStatus('all')}
            className="ml-auto text-[12.5px] font-semibold text-brand-600 hover:underline cursor-pointer"
          >
            Quitar filtro «{STAT.find((s) => (s.key === 'total' ? 'all' : s.key) === status)?.label}»
          </button>
        )}
      </div>

      <motion.div
        key={`${period}:${status}:${[...kinds].sort().join(',')}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        className="mt-4 space-y-4"
      >
        {visibleCourses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-fg-faint">
              <GraduationCap size={22} />
            </span>
            <div>
              <p className="font-semibold">
                {allItems.length === 0 ? 'Sin notas en este periodo' : 'Nada con ese filtro'}
              </p>
              <p className="mt-1 text-[13px] text-fg-muted">
                {allItems.length === 0
                  ? 'Aún no hay evaluaciones calificables en tus cursos.'
                  : 'Prueba quitando el filtro de estado o de tipo.'}
              </p>
            </div>
            {allItems.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setStatus('all');
                  setKinds(new Set(KINDS));
                }}
              >
                Quitar filtros
              </Button>
            )}
          </div>
        ) : (
          visibleCourses.map((c) => {
            const Icon = courseIcon(c.name);
            const graded = c.items.filter(isGraded).length;
            return (
              <section key={c.sectionId} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-surface card-shadow">
                <header className="flex items-center gap-3 border-b border-[var(--border)] bg-surface-2 px-4 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500/15 to-brand-600/5 text-brand-600 dark:text-brand-400">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{c.name}</span>
                    <span className="block truncate text-[11.5px] capitalize text-fg-muted">
                      {c.teacher.toLowerCase()}
                      {c.avg != null && (
                        <span className="font-semibold tabular-nums"> · Prom. {c.avg.toFixed(1)}</span>
                      )}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-[11.5px] font-semibold tabular-nums text-fg-faint sm:block">
                    {graded}/{c.items.length} calificadas
                  </span>
                  <button
                    onClick={() =>
                      navigate(`/courses/${c.courseId}/sections/${c.sectionId}`, { state: { tab: 'notas' } })
                    }
                    title="Ver notas del curso"
                    aria-label={`Ver notas de ${c.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-surface hover:text-fg cursor-pointer"
                  >
                    <ArrowRight size={16} />
                  </button>
                </header>
                <div className="divide-y divide-[var(--border)]">
                  {c.shown.map((r) => (
                    <GradeItemRow key={r.contentId} r={r} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
