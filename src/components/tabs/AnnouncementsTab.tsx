import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, History, type LucideIcon } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAsync } from '../../lib/useAsync';
import type { Announcement } from '../../types/api';
import { fmtDate, fmtDateTime, stripHtml, toDate } from '../../lib/format';
import { Loading, ErrorState, Empty } from '../StateBlock';
import { Modal } from '../Modal';
import { RichHtml } from '../RichHtml';
import { Chip } from '../ui';
import { staggerContainer, fadeUp } from '../../lib/motion';

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

function publishedMs(item: Announcement) {
  return toDate(item.announcement.publishAt)?.getTime() ?? 0;
}

function GroupHeader({
  icon: Ico,
  title,
  hint,
  count,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span
        className={`grid size-7 place-items-center rounded-lg ${
          accent
            ? 'bg-brand-600 text-white'
            : 'border border-[var(--border)] bg-surface-2 text-fg-muted'
        }`}
      >
        <Ico size={15} />
      </span>
      <h3 className="text-[14px] font-bold">{title}</h3>
      {hint && <span className="text-[12px] text-fg-faint">{hint}</span>}
      <span className="ml-auto rounded-full border border-[var(--border)] bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
        {count}
      </span>
    </div>
  );
}

function AnnouncementCard({
  item,
  current,
  onOpen,
}: {
  item: Announcement;
  current: boolean;
  onOpen: () => void;
}) {
  const { seen, announcement: a } = item;
  return (
    <motion.button
      variants={fadeUp}
      onClick={onOpen}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 pl-5 text-left transition-colors card-shadow cursor-pointer ${
        current
          ? 'border-brand-200 bg-brand-50 hover:border-brand-400 dark:border-brand-600/30 dark:bg-brand-600/10 dark:hover:border-brand-500/60'
          : 'border-[var(--border)] bg-surface hover:border-brand-500/40 hover:bg-surface-2'
      }`}
    >
      {current && <span className="absolute inset-y-0 left-0 w-1 bg-brand-600" />}
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
            current ? 'bg-brand-600 text-white' : 'bg-brand-600/10 text-brand-600 dark:text-brand-300'
          }`}
        >
          {initials(a.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[15px] font-bold">{a.title}</div>
            {!seen && <Chip tone="brand" className="shrink-0">Nuevo</Chip>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-fg-muted">
            <span className="capitalize">{a.authorName.toLowerCase()}</span>
            <span className="text-fg-faint">·</span>
            <span>{fmtDateTime(a.publishAt)}</span>
          </div>
          {a.description && (
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">
              {stripHtml(a.description)}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export function AnnouncementsTab({
  courseId,
  sectionId,
  currentWeek,
  weekRange,
}: {
  courseId: string;
  sectionId: string;
  currentWeek?: number;
  weekRange?: { startWeek: string; endWeek: string } | null;
}) {
  const api = useApi();
  const { data, loading, error } = useAsync<Announcement[]>(
    () => api.announcements(courseId, sectionId),
    [courseId, sectionId],
  );
  const [selected, setSelected] = useState<Announcement | null>(null);

  const weekStart = toDate(weekRange?.startWeek)?.getTime() ?? null;

  const { items, thisWeek, earlier } = useMemo(() => {
    const items = (data ?? [])
      .filter((a) => !a.announcement?.courseId || a.announcement.courseId === courseId)
      .sort((a, b) => publishedMs(b) - publishedMs(a));
    // Todo lo publicado desde el inicio de la semana activa se considera de esta semana.
    const thisWeek = weekStart == null ? [] : items.filter((a) => publishedMs(a) >= weekStart);
    const earlier = weekStart == null ? items : items.filter((a) => publishedMs(a) < weekStart);
    return { items, thisWeek, earlier };
  }, [data, courseId, weekStart]);

  const isCurrent = (item: Announcement) => thisWeek.includes(item);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (items.length === 0) return <Empty label="No hay anuncios en este curso." />;

  const range =
    weekRange?.startWeek && weekRange?.endWeek
      ? `${fmtDate(weekRange.startWeek)} – ${fmtDate(weekRange.endWeek)}`
      : undefined;

  return (
    <>
      <div className="space-y-6">
        {thisWeek.length > 0 && (
          <section>
            <GroupHeader
              icon={CalendarDays}
              title={currentWeek ? `Esta semana · Semana ${currentWeek}` : 'Esta semana'}
              hint={range}
              count={thisWeek.length}
              accent
            />
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2.5">
              {thisWeek.map((item) => (
                <AnnouncementCard key={item.id} item={item} current onOpen={() => setSelected(item)} />
              ))}
            </motion.div>
          </section>
        )}

        {earlier.length > 0 && (
          <section>
            {thisWeek.length > 0 && <GroupHeader icon={History} title="Anteriores" count={earlier.length} />}
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2.5">
              {earlier.map((item) => (
                <AnnouncementCard key={item.id} item={item} current={false} onOpen={() => setSelected(item)} />
              ))}
            </motion.div>
          </section>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected?.announcement.title}
        subtitle={selected ? `${fmtDateTime(selected.announcement.publishAt)}` : undefined}
      >
        {selected && (
          <div>
            <div
              className={`mb-4 flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                isCurrent(selected)
                  ? 'border-brand-200 bg-brand-50 dark:border-brand-600/30 dark:bg-brand-600/10'
                  : 'border-[var(--border)] bg-surface-2'
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                  isCurrent(selected)
                    ? 'bg-brand-600 text-white'
                    : 'bg-brand-600/10 text-brand-600 dark:text-brand-300'
                }`}
              >
                {initials(selected.announcement.authorName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold capitalize">
                  {selected.announcement.authorName.toLowerCase()}
                </div>
                <div className="text-[12px] text-fg-muted">Docente</div>
              </div>
              {isCurrent(selected) && (
                <Chip tone="brand">{currentWeek ? `Semana ${currentWeek}` : 'Esta semana'}</Chip>
              )}
            </div>
            <div className="rounded-xl border border-[var(--border)] px-4 py-3.5">
              <RichHtml html={selected.announcement.description} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
