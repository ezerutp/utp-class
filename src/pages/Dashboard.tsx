import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreVertical, MapPin, Building2, BookOpen, ListChecks, Video } from 'lucide-react';
import { useApi } from '../lib/useApi';
import type { DashboardCourse, AcademicPeriod } from '../types/api';
import { Card, Skeleton } from '../components/ui';
import { ErrorState } from '../components/StateBlock';
import { PeriodSelect } from '../components/PeriodSelect';
import { courseIcon } from '../lib/courseIcon';
import { toDate } from '../lib/format';
import { loadStoredPeriod, pickCurrentPeriod, storePeriod } from '../lib/period';
import { modalityLabel, hasLiveZoom } from '../lib/modality';
import { staggerContainer, fadeUp, EASE_OUT } from '../lib/motion';

function KebabMenu({ onOpen, onGrades }: { onOpen: () => void; onGrades: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };
  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="grid size-7 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg cursor-pointer"
        aria-label="Opciones"
      >
        <MoreVertical size={17} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-surface p-1 card-shadow-lg"
          >
            <button
              onClick={act(onOpen)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium hover:bg-surface-2 cursor-pointer"
            >
              <BookOpen size={15} /> Abrir curso
            </button>
            <button
              onClick={act(onGrades)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium hover:bg-surface-2 cursor-pointer"
            >
              <ListChecks size={15} /> Ver notas
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CourseCard({
  c,
  onOpen,
  onGrades,
  onZoom,
}: {
  c: DashboardCourse;
  onOpen: () => void;
  onGrades: () => void;
  onZoom: () => void;
}) {
  const Icon = courseIcon(c.name);
  const liveZoom = hasLiveZoom(c.modality);
  return (
    <motion.div
      variants={fadeUp}
      onClick={onOpen}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-[var(--border)] bg-surface p-5 transition-colors hover:border-brand-500/30 hover:bg-surface-2"
    >
      <div className="flex h-[66px] items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500/15 to-brand-600/5 text-brand-600 dark:text-brand-400">
          <Icon size={21} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight">
            {c.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[13px] capitalize text-fg-muted">
            {`${c.teacherFirstName} ${c.teacherLastName}`.toLowerCase()}
          </p>
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          className="self-start opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        >
          <KebabMenu onOpen={onOpen} onGrades={onGrades} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3.5">
        <span className="inline-flex h-6 items-center gap-1.5 text-[12px] font-medium text-fg-muted">
          <MapPin size={13} className="text-fg-faint" /> Aula {c.classNumber}
        </span>
        <span className="text-fg-faint">·</span>
        {liveZoom ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoom();
            }}
            title="Ir a las clases por Zoom"
            className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#2D8CFF]/10 px-2.5 text-[12px] font-semibold text-[#2D8CFF] transition-[background-color,transform] duration-150 ease-out hover:bg-[#2D8CFF]/20 active:scale-95 cursor-pointer"
          >
            <Video size={13} strokeWidth={2.25} /> Zoom en vivo
          </button>
        ) : (
          <span className="inline-flex h-6 items-center gap-1.5 text-[12px] font-medium text-fg-muted">
            <Building2 size={13} className="text-fg-faint" /> {modalityLabel(c.modality)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function Dashboard() {
  const api = useApi();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<DashboardCourse[] | null>(null);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [period, setPeriod] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    Promise.all([api.dashboardCourses(), api.academicPeriods().catch(() => ({ academicPeriods: [] }))])
      .then(([cs, ps]) => {
        if (!alive) return;
        const list = ps.academicPeriods ?? [];
        setCourses(cs);
        setPeriods(list);
        const stored = loadStoredPeriod();
        const valid = stored === 'all' || cs.some((c) => c.period === stored);
        setPeriod(stored && valid ? stored : pickCurrentPeriod(cs, list));
      })
      .catch((e) => alive && setError(e?.message ?? 'Error cargando los cursos'));
    return () => {
      alive = false;
    };
  }, [api]);

  const availablePeriods = useMemo(() => {
    const names = new Map(periods.map((p) => [p.period, p.name] as const));
    const start = new Map(
      periods.map((p) => [p.period, toDate(p.start || p.parsedStartDate)?.getTime() ?? 0] as const),
    );
    return [...new Set((courses ?? []).map((c) => c.period))]
      .sort((a, b) => (start.get(b) ?? 0) - (start.get(a) ?? 0) || a.localeCompare(b))
      .map((code) => [code, names.get(code) || code] as const);
  }, [courses, periods]);

  const visible = useMemo(
    () => (courses ?? []).filter((c) => period === 'all' || period === '' || c.period === period),
    [courses, period],
  );

  if (error) return <ErrorState error={error} />;

  const currentName = availablePeriods.find(([c]) => c === period)?.[1];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis cursos</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {courses ? (
              <>
                {visible.length} {visible.length === 1 ? 'curso' : 'cursos'}
                {currentName && period !== 'all' ? ` · ${currentName}` : ''}
              </>
            ) : (
              'Cargando tu semestre…'
            )}
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

      {!courses ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex h-[66px] items-start gap-3.5">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-2 h-3 w-3/5" />
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--border)] pt-3.5">
                <Skeleton className="h-3 w-40" />
              </div>
            </Card>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="py-20 text-center text-sm text-fg-faint">No hay cursos en este periodo.</p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {visible.map((c) => (
            <CourseCard
              key={c.sectionId}
              c={c}
              onOpen={() => navigate(`/courses/${c.courseId}/sections/${c.sectionId}`)}
              onGrades={() =>
                navigate(`/courses/${c.courseId}/sections/${c.sectionId}`, { state: { tab: 'notas' } })
              }
              onZoom={() =>
                navigate(`/courses/${c.courseId}/sections/${c.sectionId}`, { state: { tab: 'zoom' } })
              }
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
