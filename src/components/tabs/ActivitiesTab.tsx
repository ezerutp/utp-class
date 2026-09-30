import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAsync } from '../../lib/useAsync';
import type { ActivitiesResponse, ActivityContent } from '../../types/api';
import { fmtDateTime, stripHtml } from '../../lib/format';
import { Chip } from '../ui';
import { Loading, ErrorState, Empty } from '../StateBlock';
import { ActivityDetailModal } from './ActivityDetailModal';
import { staggerContainer, fadeUp } from '../../lib/motion';

type Kind = 'evaluations' | 'homework' | 'forums';

const EMPTY: Record<Kind, string> = {
  evaluations: 'No hay evaluaciones.',
  homework: 'No hay tareas.',
  forums: 'No hay foros.',
};

function StatusChip({ a }: { a: ActivityContent }) {
  if (a.statusActivityStudent === 'DELIVERED') return <Chip tone="green">Entregado</Chip>;
  const overdue = a.visibleTo && new Date(a.visibleTo.replace(' ', 'T')) < new Date();
  if (a.statusActivityStudent === 'MISSING' && overdue) return <Chip>Vencido</Chip>;
  return <Chip tone="amber">Pendiente</Chip>;
}

export function ActivitiesTab({
  kind,
  courseId,
  sectionId,
}: {
  kind: Kind;
  courseId: string;
  sectionId: string;
}) {
  const api = useApi();
  const { data, loading, error } = useAsync<ActivitiesResponse>(
    () => api[kind](courseId, sectionId),
    [kind, courseId, sectionId],
  );
  const [selected, setSelected] = useState<ActivityContent | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const items = (data?.content ?? [])
    .slice()
    .sort((a, b) => (a.contentDetail?.weekNumber ?? 0) - (b.contentDetail?.weekNumber ?? 0));
  if (items.length === 0) return <Empty label={EMPTY[kind]} />;

  return (
    <>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2.5">
        {items.map((a) => (
          <motion.button
            key={a.id}
            variants={fadeUp}
            onClick={() => setSelected(a)}
            className="group w-full rounded-2xl border border-[var(--border)] bg-surface p-4 text-left transition-colors card-shadow hover:border-brand-500/40 hover:bg-surface-2 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-bold leading-snug">{a.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-fg-faint">
                  {a.contentDetail?.weekNumber != null && (
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium">
                      Semana {a.contentDetail.weekNumber}
                    </span>
                  )}
                  {a.visibleFrom && <span>Desde {fmtDateTime(a.visibleFrom)}</span>}
                  {a.visibleTo && <span>Hasta {fmtDateTime(a.visibleTo)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusChip a={a} />
                {a.metadata?.isQualified && a.metadata?.topScore != null && (
                  <span className="text-[12px] font-semibold text-fg-faint">
                    {a.metadata.topScore} pts
                  </span>
                )}
                <ChevronRight
                  size={17}
                  className="text-fg-faint transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </div>
            {a.description && (
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">
                {stripHtml(a.description)}
              </p>
            )}
          </motion.button>
        ))}
      </motion.div>

      <ActivityDetailModal
        kind={kind}
        courseId={courseId}
        sectionId={sectionId}
        item={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
