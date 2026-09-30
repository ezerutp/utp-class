import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarX,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  ListChecks,
  MessagesSquare,
  Play,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAsync } from '../lib/useAsync';
import { Button, Chip } from '../components/ui';
import { ErrorState, Loading } from '../components/StateBlock';
import { EASE_OUT } from '../lib/motion';
import { loadStoredPeriod } from '../lib/period';
import { niceTitle } from '../lib/title';
import {
  KIND_LABEL,
  dayKey,
  loadCalendarEvents,
  type CalendarEvent,
  type EventKind,
} from '../lib/calendarEvents';

const KIND_STYLE: Record<EventKind, { dot: string; pill: string; block: string; icon: LucideIcon; tab?: string }> = {
  class: {
    dot: 'bg-[#2D8CFF]',
    pill: 'bg-[#2D8CFF]/12 text-[#1a6fd6] dark:text-[#6db0ff]',
    block: 'border-[#2D8CFF]/30 bg-[#eaf3ff] text-[#1a6fd6] dark:bg-[#15263d] dark:text-[#6db0ff]',
    icon: Video,
    tab: 'zoom',
  },
  homework: {
    dot: 'bg-brand-600',
    pill: 'bg-brand-600/12 text-brand-700 dark:text-brand-300',
    block: 'border-brand-600/30 bg-brand-50 text-brand-700 dark:bg-[#35141a] dark:text-brand-300',
    icon: ListChecks,
    tab: 'tareas',
  },
  evaluation: {
    dot: 'bg-amber-500',
    pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    block: 'border-amber-500/35 bg-amber-50 text-amber-700 dark:bg-[#35290f] dark:text-amber-300',
    icon: FlaskConical,
    tab: 'evaluaciones',
  },
  forum: {
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    block: 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-[#10302a] dark:text-emerald-300',
    icon: MessagesSquare,
    tab: 'foros',
  },
};

const KIND_PLURAL: Record<EventKind, string> = {
  class: 'Clases',
  homework: 'Tareas',
  evaluation: 'Evaluaciones',
  forum: 'Foros',
};
const KINDS: EventKind[] = ['class', 'homework', 'evaluation', 'forum'];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const fmtTime = (d: Date) => d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthTitle = (d: Date) => cap(d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }));
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfWeek = (d: Date) => {
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
};

/** Semana academica de un rango: la mas repetida entre sus eventos (las clases/actividades traen weekNumber). */
function academicWeek(events: CalendarEvent[], from: Date, to: Date): number | null {
  const count = new Map<number, number>();
  for (const e of events) {
    if (!e.week || e.date < from || e.date >= to) continue;
    count.set(e.week, (count.get(e.week) ?? 0) + 1);
  }
  let best: number | null = null;
  for (const [w, n] of count) if (best === null || n > count.get(best)!) best = w;
  return best;
}

function WeekTag({ week, current }: { week: number; current: boolean }) {
  return (
    <motion.span
      key={`${week}-${current}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={`inline-flex items-center gap-2 rounded-full border py-1 pl-2.5 pr-1 text-[12.5px] font-semibold ${
        current
          ? 'border-brand-600/25 bg-brand-600/[0.08] text-brand-700 dark:text-brand-300'
          : 'border-[var(--border-strong)] bg-surface text-fg-muted'
      }`}
    >
      {current ? (
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-500 opacity-60 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-brand-600" />
        </span>
      ) : (
        <span className="size-2 rounded-full bg-fg-faint/60" />
      )}
      {current ? 'Semana actual' : 'Semana'}
      <span
        className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11.5px] font-bold tabular-nums ${
          current ? 'bg-brand-600 text-white' : 'bg-surface-2 text-fg'
        }`}
      >
        {week}
      </span>
    </motion.span>
  );
}

function StatusChip({ e }: { e: CalendarEvent }) {
  if (!e.status) return null;
  if (e.status === 'delivered') return <Chip tone="green">Entregado</Chip>;
  if (e.status === 'overdue') return <Chip>Vencido</Chip>;
  return <Chip tone="amber">Pendiente</Chip>;
}

function EventCard({ e, onOpen }: { e: CalendarEvent; onOpen: () => void }) {
  const st = KIND_STYLE[e.kind];
  const Ico = st.icon;
  const upcomingClass = e.kind === 'class' && e.date.getTime() >= Date.now();
  return (
    <div className="rounded-xl border border-[var(--border)] bg-surface p-3">
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${st.pill}`}>
          <Ico size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="break-words text-[13.5px] font-bold leading-snug">{niceTitle(e.title)}</div>
          <div className="mt-0.5 truncate text-[12px] text-fg-muted">{niceTitle(e.courseName)}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-fg-faint">
            <span className="font-medium">{KIND_LABEL[e.kind]}</span>
            <span>·</span>
            <span>{e.kind === 'class' ? fmtTime(e.date) : `Vence ${fmtTime(e.date)}`}</span>
            {e.week ? (
              <>
                <span>·</span>
                <span>Semana {e.week}</span>
              </>
            ) : null}
          </div>
        </div>
        <StatusChip e={e} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 [&_button]:whitespace-nowrap">
        {upcomingClass && e.zoomLink && (
          <a href={e.zoomLink} target="_blank" rel="noreferrer" className="flex-1">
            <Button size="sm" className="w-full !bg-[#2D8CFF] hover:!bg-[#1a7bf0]">
              <Video size={14} /> Unirse
            </Button>
          </a>
        )}
        {e.kind === 'class' && e.playUrl && (
          <a href={e.playUrl} target="_blank" rel="noreferrer" className="flex-1">
            <Button size="sm" variant="secondary" className="w-full">
              <Play size={13} className="fill-current" /> Ver grabación
            </Button>
          </a>
        )}
        <Button size="sm" variant="ghost" className="flex-1" onClick={onOpen}>
          Abrir {e.kind === 'class' ? 'clases' : KIND_LABEL[e.kind].toLowerCase()}
        </Button>
      </div>
    </div>
  );
}

function MonthView({
  month,
  days,
  byDay,
  todayKey,
  selected,
  onSelect,
}: {
  month: Date;
  days: Date[];
  byDay: Map<string, CalendarEvent[]>;
  todayKey: string;
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-surface card-shadow">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-surface-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-fg-faint">
            {d}
          </div>
        ))}
      </div>
      <motion.div
        key={dayKey(month)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        className="grid grid-cols-7"
      >
        {days.map((d, i) => {
          const k = dayKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const evs = byDay.get(k) ?? [];
          const isToday = k === todayKey;
          const isSel = k === selected;
          return (
            <button
              key={k}
              onClick={() => onSelect(k)}
              className={`relative flex min-h-[64px] flex-col items-stretch gap-1 border-b border-r border-[var(--border)] p-1.5 text-left transition-colors hover:bg-surface-2 sm:min-h-[104px] cursor-pointer ${
                i % 7 === 6 ? 'border-r-0' : ''
              } ${i >= 35 ? 'border-b-0' : ''} ${isSel ? 'bg-brand-600/[0.06]' : ''} ${inMonth ? '' : 'bg-surface-2/50'}`}
            >
              {isSel && <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-brand-600/60" />}
              <span
                className={`grid size-6 place-items-center rounded-full text-[12px] font-bold tabular-nums ${
                  isToday ? 'bg-brand-600 text-white' : inMonth ? 'text-fg' : 'text-fg-faint'
                }`}
              >
                {d.getDate()}
              </span>

              <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                {evs.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    title={`${e.title} · ${e.courseName}`}
                    className={`flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      KIND_STYLE[e.kind].pill
                    } ${e.status === 'delivered' ? 'opacity-55' : ''}`}
                  >
                    <span className="truncate">{e.kind === 'class' ? `${fmtTime(e.date)} ` : ''}{e.title}</span>
                  </span>
                ))}
                {evs.length > 3 && <span className="px-1 text-[11px] font-semibold text-fg-muted">+{evs.length - 3} más</span>}
              </div>

              {evs.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                  {evs.slice(0, 4).map((e) => (
                    <span key={e.id} className={`size-1.5 rounded-full ${KIND_STYLE[e.kind].dot}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

const SLOT_MIN = 30;
const ROW_H = 30;
const DEFAULT_DURATION: Record<EventKind, number> = { class: 90, homework: 60, evaluation: 60, forum: 0 };

function minutesOf(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

interface PlacedEvent {
  e: CalendarEvent;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}

/** Ubica bloques solapados del mismo dia en carriles lado a lado. */
function layoutDay(evs: PlacedEvent[]): PlacedEvent[] {
  const sorted = evs.slice().sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const clusters: PlacedEvent[][] = [];
  for (const ev of sorted) {
    const last = clusters[clusters.length - 1];
    const overlaps = last?.some((o) => ev.startMin < o.endMin && o.startMin < ev.endMin);
    if (last && overlaps) last.push(ev);
    else clusters.push([ev]);
  }
  for (const c of clusters) {
    const ends: number[] = [];
    for (const ev of c) {
      let lane = ends.findIndex((end) => ev.startMin >= end);
      if (lane === -1) {
        lane = ends.length;
        ends.push(ev.endMin);
      } else {
        ends[lane] = ev.endMin;
      }
      ev.col = lane;
    }
    for (const ev of c) ev.cols = ends.length;
  }
  return sorted;
}

function eventRange(e: CalendarEvent): { startMin: number; endMin: number } {
  const startMin = minutesOf(e.date);
  const dur = e.kind === 'class' ? (e.durationMin ?? DEFAULT_DURATION.class) : DEFAULT_DURATION[e.kind];
  return { startMin, endMin: Math.max(startMin + dur, startMin + 30) };
}

function WeekView({
  weekStart,
  byDay,
  todayKey,
  selected,
  onSelect,
  onOpenEvent,
}: {
  weekStart: Date;
  byDay: Map<string, CalendarEvent[]>;
  todayKey: string;
  selected: string;
  onSelect: (k: string) => void;
  onOpenEvent?: (e: CalendarEvent) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)),
    [weekStart],
  );
  const dayLists = useMemo(() => days.map((d) => byDay.get(dayKey(d)) ?? []), [days, byDay]);

  const forumsByDay = useMemo(
    () =>
      dayLists.map((list) =>
        list
          .filter((e) => e.kind === 'forum')
          .slice()
          .sort((a, b) => a.date.getTime() - b.date.getTime()),
      ),
    [dayLists],
  );
  const timedByDay = useMemo(
    () =>
      dayLists.map((list) =>
        layoutDay(
          list
            .filter((e) => e.kind !== 'forum')
            .map((e) => {
              const { startMin, endMin } = eventRange(e);
              return { e, startMin, endMin, col: 0, cols: 1 };
            }),
        ),
      ),
    [dayLists],
  );
  const hasForums = forumsByDay.some((f) => f.length > 0);

  let minStart = 8 * 60;
  let maxEnd = 18 * 60;
  for (const day of timedByDay) {
    for (const p of day) {
      if (p.startMin < minStart) minStart = p.startMin;
      if (p.endMin > maxEnd) maxEnd = p.endMin;
    }
  }
  const START_MIN = Math.max(0, Math.min(8 * 60, Math.floor(minStart / 60) * 60));
  const END_MIN = Math.min(24 * 60, Math.max(18 * 60, Math.ceil(maxEnd / 60) * 60));
  const slots = (END_MIN - START_MIN) / SLOT_MIN;
  const gridH = slots * ROW_H;

  const nowMin = minutesOf(new Date());

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-surface card-shadow">
      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          {/* encabezado de dias */}
          <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-[var(--border)] bg-surface-2">
            <div />
            {days.map((d, i) => {
              const k = dayKey(d);
              const isToday = k === todayKey;
              const isSel = k === selected;
              return (
                <button
                  key={k}
                  onClick={() => onSelect(k)}
                  className={`px-1 py-2 text-center transition-colors hover:bg-surface cursor-pointer ${
                    i === 6 ? '' : 'border-r border-[var(--border)]'
                  } ${isSel ? 'bg-brand-600/[0.06]' : ''} ${isToday ? 'bg-brand-600/[0.08]' : ''}`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-brand-600' : 'text-fg-faint'}`}>
                    {WEEKDAYS[i]}
                  </div>
                  <div
                    className={`mx-auto mt-0.5 grid size-7 place-items-center rounded-full text-[13px] font-bold tabular-nums ${
                      isToday ? 'bg-brand-600 text-white' : 'text-fg'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  <div className="mt-0.5 text-[10px] text-fg-faint">
                    {cap(d.toLocaleDateString('es-PE', { month: 'short' })).replace('.', '')}
                  </div>
                </button>
              );
            })}
          </div>

          {/* foros del dia (jornada completa) */}
          {hasForums && (
            <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-[var(--border)]">
              <div className="px-1 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-fg-faint">
                Dia
              </div>
              {days.map((d, i) => {
                const k = dayKey(d);
                const forums = forumsByDay[i];
                return (
                  <div
                    key={k}
                    className={`space-y-1 border-r border-[var(--border)] p-1 ${i === 6 ? 'border-r-0' : ''} ${
                      k === todayKey ? 'bg-brand-600/[0.05]' : ''
                    }`}
                  >
                    {forums.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        title={`${e.title} · ${e.courseName}`}
                        onClick={() => {
                          onSelect(k);
                          onOpenEvent?.(e);
                        }}
                        className={`flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[10.5px] font-semibold leading-tight ${KIND_STYLE.forum.pill} ${e.status === 'delivered' ? 'opacity-55' : ''} cursor-pointer`}
                      >
                        <MessagesSquare size={11} className="shrink-0" />
                        <span className="line-clamp-2 break-words">{e.title}</span>
                      </button>
                    ))}
                    {forums.length > 2 && (
                      <button
                        onClick={() => onSelect(k)}
                        className="w-full px-1 text-left text-[10.5px] font-semibold text-fg-muted cursor-pointer"
                      >
                        +{forums.length - 2} mas
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* grilla horaria: celdas de 30 min */}
          <motion.div
            key={dayKey(weekStart)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))]"
          >
            <div>
              {Array.from({ length: slots }, (_, s) => {
                const min = START_MIN + s * SLOT_MIN;
                const hour = s % 2 === 0;
                const label = hour
                  ? new Date(2000, 0, 1, Math.floor(min / 60), 0).toLocaleTimeString('es-PE', {
                      hour: 'numeric',
                      hour12: false,
                    }) + ':00'
                  : '';
                return (
                  <div
                    key={s}
                    className={`relative h-[30px] border-t ${hour ? 'border-[var(--border)]' : 'border-dashed border-[var(--border)]/70'}`}
                  >
                    {hour && (
                      <span className="absolute -top-2 right-1 bg-surface px-0.5 text-[10px] font-semibold tabular-nums text-fg-faint">
                        {label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {days.map((d, i) => {
              const k = dayKey(d);
              const isToday = k === todayKey;
              return (
                <div
                  key={k}
                  onClick={() => onSelect(k)}
                  className={`relative border-r border-[var(--border)] ${i === 6 ? 'border-r-0' : ''} ${
                    isToday ? 'bg-brand-600/[0.05]' : ''
                  } ${k === selected ? 'bg-brand-600/[0.03]' : ''}`}
                  style={{ height: gridH }}
                >
                  {Array.from({ length: slots }, (_, s) => (
                    <div
                      key={s}
                      className={`h-[30px] border-t ${s % 2 === 0 ? 'border-[var(--border)]/70' : 'border-dashed border-[var(--border)]/50'}`}
                    />
                  ))}

                  {isToday && nowMin >= START_MIN && nowMin < END_MIN && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: ((nowMin - START_MIN) / SLOT_MIN) * ROW_H }}
                    >
                      <span className="size-2 -translate-x-1/2 rounded-full bg-brand-600" />
                      <span className="h-0.5 flex-1 bg-brand-600/70" />
                    </div>
                  )}

                  {timedByDay[i].map((p) => {
                    const st = KIND_STYLE[p.e.kind];
                    const Ico = st.icon;
                    const top = ((p.startMin - START_MIN) / SLOT_MIN) * ROW_H;
                    const height = Math.max(((p.endMin - p.startMin) / SLOT_MIN) * ROW_H - 4, 30);
                    const width = 100 / p.cols;
                    return (
                      <button
                        key={p.e.id}
                        title={`${fmtTime(p.e.date)} · ${p.e.title} · ${p.e.courseName}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onSelect(k);
                          onOpenEvent?.(p.e);
                        }}
                        style={{ top, height, left: `calc(${(p.col * width).toFixed(2)}% + 2px)`, width: `calc(${width.toFixed(2)}% - 4px)` }}
                        className={`absolute overflow-hidden rounded-lg px-1.5 py-1 text-left ring-1 ring-inset ring-black/5 transition-transform hover:z-10 hover:scale-[1.02] cursor-pointer ${st.pill} ${
                          p.e.status === 'delivered' ? 'opacity-55' : ''
                        } ${p.e.status === 'overdue' && p.e.kind !== 'class' ? 'ring-brand-600/40' : ''}`}
                      >
                        <span className="flex items-center gap-1 text-[10.5px] font-bold leading-tight">
                          <Ico size={11} className="shrink-0" />
                          <span className="truncate tabular-nums">{fmtTime(p.e.date)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-3 block break-words text-[10.5px] font-semibold leading-tight">
                          {p.e.title}
                        </span>
                        {height >= 64 && p.e.week != null && (
                          <span className="mt-0.5 block text-[9.5px] opacity-70">Semana {p.e.week}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function Calendar() {
  const api = useApi();
  const navigate = useNavigate();

  const { data, loading, error } = useAsync(async () => {
    const [courses, ps] = await Promise.all([
      api.dashboardCourses(),
      api.academicPeriods().catch(() => ({ academicPeriods: [] })),
    ]);
    const stored = loadStoredPeriod();
    const codes = [...new Set(courses.map((c) => c.period))];
    const latest = ps.academicPeriods?.find((p) => p.type === 'LATEST_PERIOD')?.period;
    const period = stored && (stored === 'all' || codes.includes(stored)) ? stored : latest && codes.includes(latest) ? latest : 'all';
    const list = period === 'all' ? courses : courses.filter((c) => c.period === period);
    const name = ps.academicPeriods?.find((p) => p.period === period)?.name;
    return { events: await loadCalendarEvents(api, list), periodName: period === 'all' ? 'Todos los periodos' : name ?? period };
  }, [api]);

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<'month' | 'week'>('week');
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selected, setSelected] = useState(() => dayKey(today));
  const [active, setActive] = useState<Set<EventKind>>(() => new Set(KINDS));

  // Si no hay eventos en el periodo visible, abrir el mes/semana del evento mas cercano.
  useEffect(() => {
    const events = data?.events ?? [];
    if (!events.length) return;
    const nearest = events.reduce((a, b) =>
      Math.abs(b.date.getTime() - today.getTime()) < Math.abs(a.date.getTime() - today.getTime()) ? b : a,
    );
    setMonth(startOfMonth(nearest.date));
    setWeekStart(startOfWeek(nearest.date));
    setSelected(dayKey(nearest.date));
  }, [data, today]);

  const visible = useMemo(() => (data?.events ?? []).filter((e) => active.has(e.kind)), [data, active]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of visible) {
      const k = dayKey(e.date);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [visible]);

  const viewCounts = useMemo(() => {
    const c: Record<EventKind, number> = { class: 0, homework: 0, evaluation: 0, forum: 0 };
    for (const e of data?.events ?? []) {
      if (view === 'month') {
        if (e.date.getFullYear() === month.getFullYear() && e.date.getMonth() === month.getMonth()) c[e.kind]++;
      } else {
        const start = weekStart.getTime();
        const end = start + 7 * 24 * 3600 * 1000;
        const t = e.date.getTime();
        if (t >= start && t < end) c[e.kind]++;
      }
    }
    return c;
  }, [data, view, month, weekStart]);

  const days = useMemo(() => {
    const offset = (month.getDay() + 6) % 7;
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);

  if (loading) return <Loading label="Armando tu calendario…" />;
  if (error || !data) return <ErrorState error={error ?? 'No se pudo cargar el calendario.'} />;

  const todayKey = dayKey(today);
  // En vista semana: la semana academica que se esta viendo. En vista mes: la actual.
  const shownWeek = (() => {
    const from = view === 'week' ? weekStart : startOfWeek(today);
    const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
    const week = academicWeek(data.events, from, to);
    return week ? { week, current: today >= from && today < to } : null;
  })();
  const shift = (n: number) => {
    if (view === 'month') setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
    else setWeekStart((w) => new Date(w.getFullYear(), w.getMonth(), w.getDate() + n * 7));
  };
  const goToday = () => {
    setMonth(startOfMonth(today));
    setWeekStart(startOfWeek(today));
    setSelected(todayKey);
  };
  const toggle = (k: EventKind) =>
    setActive((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const selectedEvents = (byDay.get(selected) ?? []).slice().sort((a, b) => a.date.getTime() - b.date.getTime());
  const selectedDate = new Date(`${selected}T00:00:00`);

  const open = (e: CalendarEvent) =>
    navigate(`/courses/${e.courseId}/sections/${e.sectionId}`, { state: { tab: KIND_STYLE[e.kind].tab } });

  const rangeLabel =
    view === 'month'
      ? monthTitle(month)
      : (() => {
          const end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
          const sameMonth = weekStart.getMonth() === end.getMonth();
          const left = sameMonth
            ? `${weekStart.getDate()}`
            : `${weekStart.getDate()} ${cap(weekStart.toLocaleDateString('es-PE', { month: 'short' }))}`;
          const right = `${end.getDate()} ${cap(end.toLocaleDateString('es-PE', { month: 'short' }))} ${end.getFullYear()}`;
          return `${left} – ${right}`;
        })();

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
            {shownWeek && <WeekTag week={shownWeek.week} current={shownWeek.current} />}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{data.periodName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[var(--border-strong)] bg-surface p-1">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer ${
                  view === v ? 'bg-brand-600 text-white shadow-sm' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={goToday}>
            Hoy
          </Button>
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-surface p-1">
            <button
              onClick={() => shift(-1)}
              aria-label={view === 'month' ? 'Mes anterior' : 'Semana anterior'}
              className="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[132px] text-center text-[14px] font-bold">{rangeLabel}</span>
            <button
              onClick={() => shift(1)}
              aria-label={view === 'month' ? 'Mes siguiente' : 'Semana siguiente'}
              className="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {KINDS.map((k) => {
          const on = active.has(k);
          const st = KIND_STYLE[k];
          return (
            <button
              key={k}
              onClick={() => toggle(k)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-[background-color,opacity,transform] duration-150 active:scale-95 cursor-pointer ${
                on
                  ? 'border-[var(--border-strong)] bg-surface'
                  : 'border-[var(--border)] bg-transparent text-fg-faint opacity-60'
              }`}
            >
              <span className={`size-2.5 rounded-full ${st.dot}`} />
              {KIND_PLURAL[k]}
              <span className="rounded-full bg-surface-2 px-1.5 text-[11px] tabular-nums text-fg-muted">{viewCounts[k]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        {view === 'month' ? (
          <MonthView
            month={month}
            days={days}
            byDay={byDay}
            todayKey={todayKey}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <WeekView
            weekStart={weekStart}
            byDay={byDay}
            todayKey={todayKey}
            selected={selected}
            onSelect={setSelected}
            onOpenEvent={open}
          />
        )}

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-[var(--border)] bg-surface p-4 card-shadow">
            <div className="text-[11px] font-bold uppercase tracking-wide text-fg-faint">
              {selected === todayKey ? 'Hoy' : 'Día seleccionado'}
            </div>
            <div className="mt-0.5 text-[16px] font-bold">
              {cap(selectedDate.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }))}
            </div>

            <div className="mt-3 space-y-2.5">
              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-8 text-center text-[13px] text-fg-faint">
                  <CalendarX size={22} />
                  Sin eventos este día
                </div>
              ) : (
                selectedEvents.map((e) => <EventCard key={e.id} e={e} onOpen={() => open(e)} />)
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
