import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Unity, Content, ActivityContent, ActivitiesResponse } from '../../types/api';
import { CONTENT_ICON, CONTENT_LABEL, fmtDateTime, fmtSize, stripHtml } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { Chip, Spinner } from '../ui';
import { Empty } from '../StateBlock';
import { EASE_OUT } from '../../lib/motion';
import { ActivityDetailModal } from './ActivityDetailModal';

type Kind = 'evaluations' | 'homework' | 'forums';
type TabTarget = 'evaluaciones' | 'tareas' | 'foros';

const ACTIVITY_KIND: Record<string, { kind: Kind; tab: TabTarget }> = {
  EVALUATION: { kind: 'evaluations', tab: 'evaluaciones' },
  HOMEWORK: { kind: 'homework', tab: 'tareas' },
  FORUM: { kind: 'forums', tab: 'foros' },
};

function ContentRow({
  c,
  loading,
  onOpenActivity,
}: {
  c: Content;
  loading: boolean;
  onOpenActivity: (c: Content) => void;
}) {
  const href = c.metadata?.url;
  const isLink = (c.type === 'FILE' || c.type === 'URL') && !!href;
  const isActivity = c.type in ACTIVITY_KIND;
  const interactive = isLink || isActivity;
  const Tag = isLink ? 'a' : isActivity ? 'button' : 'div';
  return (
    <Tag
      {...(isLink ? { href, target: '_blank', rel: 'noreferrer' } : {})}
      {...(isActivity ? { type: 'button' as const, onClick: () => onOpenActivity(c), disabled: loading } : {})}
      className={`group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-surface px-3.5 py-3 text-left transition-colors ${
        interactive ? 'hover:border-brand-400 hover:bg-surface-2 cursor-pointer' : ''
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-[16px]">
        {CONTENT_ICON[c.type] ?? '•'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">
          {c.title || stripHtml(c.metadata?.title)}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-fg-faint">
          <span className="font-medium">{CONTENT_LABEL[c.type] ?? c.type}</span>
          {c.type === 'FILE' && c.metadata?.filetype && (
            <span>
              {c.metadata.filetype.toUpperCase()} · {fmtSize(c.metadata.size)}
            </span>
          )}
          {c.visibleTo && <span>Hasta {fmtDateTime(c.visibleTo)}</span>}
        </div>
      </div>
      {c.isDelivered ? (
        <Chip tone="green">Revisado</Chip>
      ) : c.isCaduced ? (
        <Chip>Vencido</Chip>
      ) : null}
      {loading ? (
        <Spinner className="size-4 border-2" />
      ) : (
        interactive && (
          <span className="text-[13px] font-bold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
            →
          </span>
        )
      )}
    </Tag>
  );
}

function WeekAccordion({
  week,
  themes,
  defaultOpen,
  loadingId,
  onOpenActivity,
}: {
  week: number;
  themes: Unity['themes'];
  defaultOpen: boolean;
  loadingId: string | null;
  onOpenActivity: (c: Content) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = themes.reduce((n, t) => n + (t.contents?.filter((c) => c.isVisible).length ?? 0), 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-surface card-shadow">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-[13px] font-bold text-white">
          {week === 0 ? '★' : String(week).padStart(2, '0')}
        </span>
        <span className="flex-1 font-bold">
          {week === 0 ? 'General' : `Semana ${String(week).padStart(2, '0')}`}
        </span>
        <Chip>{count} recursos</Chip>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="text-fg-faint"
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">
              {themes.map((t) => {
                const visible = (t.contents ?? []).filter((c) => c.isVisible);
                return (
                  <div key={t.themeId}>
                    <div className="mb-2 mt-1 text-[13px] font-semibold text-fg-muted">{t.name}</div>
                    <div className="space-y-2">
                      {visible.map((c) => (
                        <ContentRow
                          key={c.contentId}
                          c={c}
                          loading={loadingId === c.contentId}
                          onOpenActivity={onOpenActivity}
                        />
                      ))}
                      {visible.length === 0 && (
                        <p className="text-[12px] text-fg-faint">Sin recursos publicados</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ContentTab({
  unities,
  courseId,
  sectionId,
  onGoToTab,
}: {
  unities: Unity[];
  courseId: string;
  sectionId: string;
  onGoToTab: (tab: TabTarget) => void;
}) {
  const api = useApi();
  const cache = useRef(new Map<Kind, ActivityContent[]>());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ kind: Kind; item: ActivityContent } | null>(null);

  // El contenido del curso y la lista de actividades usan ids distintos; se cruzan por id, activityId o titulo.
  const openActivity = async (c: Content) => {
    const target = ACTIVITY_KIND[c.type];
    if (!target || loadingId) return;
    setLoadingId(c.contentId);
    try {
      let items = cache.current.get(target.kind);
      if (!items) {
        const res: ActivitiesResponse = await api[target.kind](courseId, sectionId);
        items = res.content ?? [];
        cache.current.set(target.kind, items);
      }
      const item =
        items.find((a) => a.id === c.contentId) ??
        (c.activityId
          ? items.find((a) => a.id === c.activityId || a.contentDetail?.activityId === c.activityId)
          : undefined) ??
        items.find((a) => a.title === c.title);
      if (item) setOpened({ kind: target.kind, item });
      else onGoToTab(target.tab);
    } catch {
      onGoToTab(target.tab);
    } finally {
      setLoadingId(null);
    }
  };

  const weeks = useMemo(() => {
    const themes = unities.flatMap((u) => u.themes ?? []);
    const map = new Map<number, typeof themes>();
    themes.forEach((t) => {
      const arr = map.get(t.weekNumber) ?? [];
      arr.push(t);
      map.set(t.weekNumber, arr);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [unities]);

  if (weeks.length === 0) return <Empty label="Este curso no tiene contenido cargado." />;

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-semibold text-fg-muted">
        Total de semanas ({weeks.filter(([w]) => w > 0).length})
      </p>
      {weeks.map(([week, themes], i) => (
        <WeekAccordion
          key={week}
          week={week}
          themes={themes}
          defaultOpen={i < 2}
          loadingId={loadingId}
          onOpenActivity={openActivity}
        />
      ))}
      <ActivityDetailModal
        kind={opened?.kind ?? 'forums'}
        courseId={courseId}
        sectionId={sectionId}
        item={opened?.item ?? null}
        onClose={() => setOpened(null)}
      />
    </div>
  );
}
