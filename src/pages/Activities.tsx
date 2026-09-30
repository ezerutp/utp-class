import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarCheck,
  CircleAlert,
  CircleCheck,
  Clock,
  FlaskConical,
  Hourglass,
  ListChecks,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAsync } from '../lib/useAsync';
import { ErrorState, Loading } from '../components/StateBlock';
import { Button, Spinner } from '../components/ui';
import { ActivityDetailModal } from '../components/tabs/ActivityDetailModal';
import { RangeNav, rangeOf, shiftAnchor, type RangeView } from '../components/RangeNav';
import { EASE_OUT } from '../lib/motion';
import { fmtDuration } from '../lib/format';
import { niceTitle } from '../lib/title';
import { KIND_LABEL, dayKey, loadActivityEvents, type CalendarEvent, type EventKind } from '../lib/calendarEvents';
import type { ActivitiesResponse, ActivityContent } from '../types/api';

type ActivityKind = Exclude<EventKind, 'class'>;
type ModalKind = 'homework' | 'evaluations' | 'forums';
type StatusFilter = 'all' | 'pending' | 'soon' | 'overdue' | 'delivered';

const SOON_MS = 48 * 3600 * 1000;

const KIND: Record<ActivityKind, { icon: LucideIcon; box: string; dot: string; plural: string; modal: ModalKind; tab: string }> = {
  homework: {
    icon: ListChecks,
    box: 'bg-brand-600/12 text-brand-700 dark:text-brand-300',
    dot: 'bg-brand-600',
    plural: 'Tareas',
    modal: 'homework',
    tab: 'tareas',
  },
  evaluation: {
    icon: FlaskConical,
    box: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    plural: 'Evaluaciones',
    modal: 'evaluations',
    tab: 'evaluaciones',
  },
  forum: {
    icon: MessagesSquare,
    box: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    plural: 'Foros',
    modal: 'forums',
    tab: 'foros',
  },
};
const KINDS: ActivityKind[] = ['homework', 'evaluation', 'forum'];

const isSoon = (e: CalendarEvent, now: number) =>
  e.status === 'pending' && e.date.getTime() - now <= SOON_MS;

const matches = (f: StatusFilter, e: CalendarEvent, now: number) =>
  f === 'all' || (f === 'soon' ? isSoon(e, now) : e.status === f);

const fmtTime = (d: Date) => d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function dayTitle(d: Date, today: Date) {
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
  const long = cap(d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }));
  if (diff === 0) return { lead: 'Hoy', rest: long };
  if (diff === 1) return { lead: 'Mañana', rest: long };
  if (diff === -1) return { lead: 'Ayer', rest: long };
  return { lead: long, rest: '' };
}

/* ---------- Resumen / filtros de estado ---------- */

const STAT: { key: StatusFilter; label: string; icon: LucideIcon; tone: string; ring: string }[] = [
  { key: 'pending', label: 'Pendientes', icon: Hourglass, tone: 'text-amber-600 dark:text-amber-300 bg-amber-500/12', ring: 'ring-amber-500/50' },
  { key: 'soon', label: 'Vencen en 48 h', icon: Clock, tone: 'text-brand-600 dark:text-brand-300 bg-brand-600/10', ring: 'ring-brand-600/50' },
  { key: 'overdue', label: 'Vencidas', icon: CircleAlert, tone: 'text-fg-muted bg-surface-2', ring: 'ring-[var(--border-strong)]' },
  { key: 'delivered', label: 'Entregadas', icon: CircleCheck, tone: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/12', ring: 'ring-emerald-500/50' },
];

function Summary({
  events,
  now,
  filter,
  onFilter,
  view,
}: {
  events: CalendarEvent[];
  now: number;
  filter: StatusFilter;
  onFilter: (f: StatusFilter) => void;
  view: RangeView;
}) {
  const counts = Object.fromEntries(STAT.map((s) => [s.key, events.filter((e) => matches(s.key, e, now)).length]));
  const done = counts.delivered;
  const pct = events.length ? Math.round((done / events.length) * 100) : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
      <div className="rounded-2xl border border-[var(--border)] bg-surface p-4 card-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-fg-faint">
            Avance {view === 'week' ? 'de la semana' : 'del mes'}
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-fg-muted">
            {done} de {events.length}
          </span>
        </div>
        <div className="mt-2 text-[28px] font-bold leading-none tabular-nums">{pct}%</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          />
        </div>
        <p className="mt-2 text-[12px] text-fg-muted">
          {events.length === 0
            ? 'Sin actividades en este rango.'
            : counts.pending === 0
              ? '¡Todo al día! 🎉'
              : `Te ${counts.pending === 1 ? 'queda 1 actividad' : `quedan ${counts.pending} actividades`} por entregar.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT.map((s) => {
          const on = filter === s.key;
          const Ico = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => onFilter(on ? 'all' : s.key)}
              aria-pressed={on}
              className={`flex flex-col items-start rounded-2xl border border-[var(--border)] bg-surface p-3.5 text-left card-shadow transition-[transform,box-shadow] duration-150 active:scale-[0.98] cursor-pointer ${
                on ? `ring-2 ${s.ring}` : 'hover:border-[var(--border-strong)]'
              }`}
            >
              <span className={`grid size-8 place-items-center rounded-lg ${s.tone}`}>
                <Ico size={16} />
              </span>
              <span className="mt-2.5 text-[22px] font-bold leading-none tabular-nums">{counts[s.key]}</span>
              <span className="mt-1 text-[12px] font-medium text-fg-muted">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Fila de actividad ---------- */

function StatusBadge({ e, now }: { e: CalendarEvent; now: number }) {
  const diff = e.date.getTime() - now;
  if (e.status === 'delivered')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CircleCheck size={12} /> Entregado
      </span>
    );
  if (e.status === 'overdue')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
        Venció hace {fmtDuration(diff)}
      </span>
    );
  const soon = diff <= SOON_MS;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        soon ? 'bg-brand-600/10 text-brand-700 dark:text-brand-300' : 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
      }`}
    >
      <Clock size={12} /> Vence en {fmtDuration(diff)}
    </span>
  );
}

function ActivityRow({
  e,
  now,
  loading,
  onOpen,
  onCourse,
}: {
  e: CalendarEvent;
  now: number;
  loading: boolean;
  onOpen: () => void;
  onCourse: () => void;
}) {
  const k = KIND[e.kind as ActivityKind];
  const Ico = k.icon;
  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70 ${
        e.status === 'delivered' ? 'opacity-70' : ''
      }`}
    >
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${k.box}`}>
          {loading ? <Spinner /> : <Ico size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{niceTitle(e.title)}</span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12px] text-fg-muted">
            <span className="font-medium">{KIND_LABEL[e.kind]}</span>
            <span className="text-fg-faint">·</span>
            <span className="truncate">{niceTitle(e.courseName)}</span>
            {e.week ? (
              <>
                <span className="text-fg-faint">·</span>
                <span>Semana {e.week}</span>
              </>
            ) : null}
          </span>
        </span>
      </button>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <StatusBadge e={e} now={now} />
        <span className="text-[11.5px] tabular-nums text-fg-faint">{fmtTime(e.date)}</span>
      </div>
      <button
        onClick={onCourse}
        title="Ir al curso"
        aria-label="Ir al curso"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-faint opacity-0 transition-[opacity,background-color] hover:bg-surface hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer max-sm:opacity-100"
      >
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

/* ---------- Pagina ---------- */

export function Activities() {
  const api = useApi();
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => loadActivityEvents(api), [api]);

  const today = useMemo(() => new Date(), []);
  const now = today.getTime();
  const [view, setView] = useState<RangeView>('week');
  const [anchor, setAnchor] = useState(today);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kinds, setKinds] = useState<Set<ActivityKind>>(() => new Set(KINDS));

  const [opening, setOpening] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ e: CalendarEvent; kind: ModalKind; item: ActivityContent } | null>(null);
  const cache = useRef(new Map<string, ActivityContent[]>());

  const activities = useMemo(() => (data ?? []).filter((e) => e.kind !== 'class'), [data]);
  const [from, to] = rangeOf(view, anchor);
  const inRange = activities.filter((e) => e.date >= from && e.date < to);
  const byKind = inRange.filter((e) => kinds.has(e.kind as ActivityKind));
  const shown = byKind.filter((e) => matches(status, e, now));

  const groups = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of shown) m.set(dayKey(e.date), [...(m.get(dayKey(e.date)) ?? []), e]);
    return [...m.entries()];
  }, [shown]);

  // Proxima actividad pendiente fuera del rango, para el estado vacio.
  const nextPending = activities.find((e) => e.status === 'pending' && e.date >= to);

  if (loading) return <Loading label="Juntando tus actividades…" />;
  if (error || !data) return <ErrorState error={error ?? 'No se pudieron cargar las actividades.'} />;

  const goToCourse = (e: CalendarEvent) =>
    navigate(`/courses/${e.courseId}/sections/${e.sectionId}`, { state: { tab: KIND[e.kind as ActivityKind].tab } });

  // La lista de actividades del curso usa ids distintos al contenido: se cruza por id, activityId o titulo.
  const openDetail = async (e: CalendarEvent) => {
    if (opening) return;
    const kind = KIND[e.kind as ActivityKind].modal;
    const key = `${e.sectionId}:${kind}`;
    setOpening(e.id);
    try {
      let items = cache.current.get(key);
      if (!items) {
        const res: ActivitiesResponse = await api[kind](e.courseId, e.sectionId);
        items = res.content ?? [];
        cache.current.set(key, items);
      }
      const item =
        items.find((a) => a.id === e.contentId) ??
        (e.activityId
          ? items.find((a) => a.id === e.activityId || a.contentDetail?.activityId === e.activityId)
          : undefined) ??
        items.find((a) => a.title === e.title);
      if (item) setOpened({ e, kind, item });
      else goToCourse(e);
    } catch {
      goToCourse(e);
    } finally {
      setOpening(null);
    }
  };

  const toggleKind = (k: ActivityKind) =>
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
          <h1 className="text-2xl font-bold tracking-tight">Actividades</h1>
          <p className="mt-1 text-sm text-fg-muted">Tus cursos activos</p>
        </div>
        <RangeNav
          view={view}
          anchor={anchor}
          onView={setView}
          onShift={(n) => setAnchor((a) => shiftAnchor(view, a, n))}
          onToday={() => setAnchor(today)}
        />
      </div>

      <div className="mt-5">
        <Summary events={byKind} now={now} filter={status} onFilter={setStatus} view={view} />
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
                {inRange.filter((e) => e.kind === k).length}
              </span>
            </button>
          );
        })}
        {status !== 'all' && (
          <button
            onClick={() => setStatus('all')}
            className="ml-auto text-[12.5px] font-semibold text-brand-600 hover:underline cursor-pointer"
          >
            Quitar filtro «{STAT.find((s) => s.key === status)?.label}»
          </button>
        )}
      </div>

      <motion.div
        key={`${view}:${dayKey(from)}:${status}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        className="mt-4 space-y-4"
      >
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-fg-faint">
              <CalendarCheck size={22} />
            </span>
            <div>
              <p className="font-semibold">
                {status === 'all' ? `Sin actividades ${view === 'week' ? 'esta semana' : 'este mes'}` : 'Nada con ese filtro'}
              </p>
              <p className="mt-1 text-[13px] text-fg-muted">
                {nextPending
                  ? `La próxima vence el ${nextPending.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}.`
                  : 'No tienes entregas pendientes más adelante.'}
              </p>
            </div>
            {nextPending && (
              <Button size="sm" variant="secondary" onClick={() => setAnchor(nextPending.date)}>
                Ir a la próxima <ArrowRight size={14} />
              </Button>
            )}
          </div>
        ) : (
          groups.map(([k, evs]) => {
            const t = dayTitle(evs[0].date, today);
            return (
              <section key={k} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-surface card-shadow">
                <header className="flex items-center justify-between border-b border-[var(--border)] bg-surface-2 px-4 py-2.5">
                  <span className="text-[13px] font-bold">
                    <span className={t.lead === 'Hoy' ? 'text-brand-600' : ''}>{t.lead}</span>
                    {t.rest && <span className="font-medium text-fg-muted"> · {t.rest}</span>}
                  </span>
                  <span className="text-[11.5px] font-semibold tabular-nums text-fg-faint">
                    {evs.length} {evs.length === 1 ? 'actividad' : 'actividades'}
                  </span>
                </header>
                <div className="divide-y divide-[var(--border)]">
                  {evs.map((e) => (
                    <ActivityRow
                      key={e.id}
                      e={e}
                      now={now}
                      loading={opening === e.id}
                      onOpen={() => openDetail(e)}
                      onCourse={() => goToCourse(e)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </motion.div>

      <ActivityDetailModal
        kind={opened?.kind ?? 'homework'}
        courseId={opened?.e.courseId ?? ''}
        sectionId={opened?.e.sectionId ?? ''}
        item={opened?.item ?? null}
        onClose={() => setOpened(null)}
      />
    </div>
  );
}
