import type { ReactNode } from 'react';
import {
  MessageCircleQuestion,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  FlaskConical,
  MessagesSquare,
  PackageCheck,
  RotateCw,
  Trophy,
  User,
  type LucideIcon,
  Users,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAsync } from '../../lib/useAsync';
import type { ActivityContent, HomeworkDetail, ForumDetail } from '../../types/api';
import { fmtDate, fmtDateTime, fmtDuration, stripHtml, toDate } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Modal } from '../Modal';
import { RichHtml } from '../RichHtml';
import { Spinner } from '../ui';
import { ForumThread } from './ForumThread';

type Kind = 'evaluations' | 'homework' | 'forums';
type Icon = LucideIcon;
type Tone = 'neutral' | 'green' | 'amber' | 'brand';

const toneBox: Record<Tone, string> = {
  neutral: 'border-[var(--border)] bg-surface-2',
  green:
    'border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10',
  amber: 'border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10',
  brand: 'border-brand-200 bg-brand-50 dark:border-brand-600/30 dark:bg-brand-600/10',
};
const toneIcon: Record<Tone, string> = {
  neutral: 'bg-surface text-fg-muted border border-[var(--border)]',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  brand: 'bg-brand-600/15 text-brand-600 dark:text-brand-300',
};
const toneText: Record<Tone, string> = {
  neutral: 'text-fg',
  green: 'text-emerald-700 dark:text-emerald-300',
  amber: 'text-amber-700 dark:text-amber-300',
  brand: 'text-brand-700 dark:text-brand-300',
};

/** Estado principal: entregado / vence en X / venció hace X. */
function StatusBanner({
  delivered,
  until,
  untilLabel = 'Entrega hasta',
  openLabel = 'Vence en',
  closedLabel = 'Venció hace',
}: {
  delivered: boolean;
  until: string | null | undefined;
  untilLabel?: string;
  openLabel?: string;
  closedLabel?: string;
}) {
  const end = toDate(until);
  const diff = end ? end.getTime() - Date.now() : null;

  let tone: Tone = 'neutral';
  let Ico: Icon = Clock;
  let title = 'Sin fecha límite';
  if (delivered) {
    tone = 'green';
    Ico = CircleCheck;
    title = 'Entregado';
  } else if (diff != null && diff < 0) {
    tone = 'brand';
    Ico = CircleAlert;
    title = `${closedLabel} ${fmtDuration(diff)}`;
  } else if (diff != null) {
    tone = diff < 48 * 3600 * 1000 ? 'amber' : 'neutral';
    title = `${openLabel} ${fmtDuration(diff)}`;
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-3', toneBox[tone])}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', toneIcon[tone])}>
        <Ico size={20} />
      </span>
      <div className="min-w-0">
        <div className={cn('text-[14.5px] font-bold leading-tight', toneText[tone])}>{title}</div>
        {end && (
          <div className="mt-0.5 text-[12.5px] text-fg-muted">
            {untilLabel} · {fmtDateTime(until)}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Ico, label, value }: { icon: Icon; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-surface-2 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-fg-faint">
        <Ico size={13} /> {label}
      </div>
      <div className="mt-1 truncate text-[15px] font-bold leading-tight">{value}</div>
    </div>
  );
}

function StatGrid({ children }: { children: ReactNode }) {
  return <div className="mt-3 grid grid-cols-3 gap-2.5">{children}</div>;
}

function DateLine({ icon: Ico, label, value }: { icon: Icon; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-fg-muted">
      <Ico size={14} className="text-fg-faint" />
      <span>{label}</span>
      <span className="ml-auto font-medium text-fg">{value}</span>
    </div>
  );
}

function Section({
  icon: Ico,
  title,
  html,
}: {
  icon: Icon;
  title: string;
  html?: string | null;
}) {
  if (!html || !stripHtml(html)) return null;
  return (
    <section className="mt-5">
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold">
        <span className="grid size-6 place-items-center rounded-md bg-brand-600/10 text-brand-600 dark:text-brand-300">
          <Ico size={14} />
        </span>
        {title}
      </h3>
      <div className="rounded-xl border border-[var(--border)] px-3.5 py-3">
        <RichHtml html={html} />
      </div>
    </section>
  );
}

function HomeworkBody({ sectionId, item }: { sectionId: string; item: ActivityContent }) {
  const api = useApi();
  const { data, loading, error } = useAsync<HomeworkDetail>(
    () => api.homeworkDetail(sectionId, item.id),
    [sectionId, item.id],
  );
  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (error || !data) return <p className="py-6 text-center text-sm text-fg-muted">No se pudo cargar el detalle.</p>;
  return (
    <div>
      <StatusBanner delivered={item.statusActivityStudent === 'DELIVERED'} until={data.availableUntil} />
      <StatGrid>
        <Stat icon={Trophy} label="Puntaje" value={`${data.evaluationTopScore} pts`} />
        <Stat icon={RotateCw} label="Intentos" value={data.attempts} />
        <Stat
          icon={data.isGroup ? Users : User}
          label="Modalidad"
          value={data.isGroup ? 'Grupal' : 'Individual'}
        />
      </StatGrid>
      <div className="mt-3 px-1">
        <DateLine icon={CalendarClock} label="Disponible desde" value={fmtDateTime(data.availableFrom)} />
      </div>
      <Section icon={FileText} title="Instrucciones" html={data.content} />
      <Section icon={PackageCheck} title="Qué entregar" html={data.deliverables} />
    </div>
  );
}

function ForumBody({ courseId, sectionId, id }: { courseId: string; sectionId: string; id: string }) {
  const api = useApi();
  const { data, loading, error } = useAsync<ForumDetail>(
    () => api.forumDetail(sectionId, id),
    [sectionId, id],
  );
  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (error || !data) return <p className="py-6 text-center text-sm text-fg-muted">No se pudo cargar el detalle.</p>;
  const f = data.forum;
  return (
    <div>
      <StatusBanner
        delivered={false}
        until={f.finishAt}
        untilLabel="Cierra"
        openLabel="Cierra en"
        closedLabel="Cerró hace"
      />
      <StatGrid>
        <Stat
          icon={Trophy}
          label="Calificación"
          value={f.isEvaluated ? `${f.evaluationTopScore} pts` : 'Sin nota'}
        />
        <Stat
          icon={f.isConsultation ? MessageCircleQuestion : MessagesSquare}
          label="Tipo"
          value={f.isConsultation ? 'Consulta' : 'Participación'}
        />
        <Stat icon={CalendarClock} label="Publicado" value={fmtDate(f.publishAt)} />
      </StatGrid>
      <Section icon={FileText} title="Enunciado" html={f.content} />
      <ForumThread courseId={courseId} sectionId={sectionId} forumId={id} />
    </div>
  );
}

function EvaluationBody({ item }: { item: ActivityContent }) {
  const topScore = item.metadata?.topScore;
  return (
    <div>
      <StatusBanner
        delivered={item.statusActivityStudent === 'DELIVERED'}
        until={item.visibleTo}
        untilLabel="Disponible hasta"
      />
      {(topScore != null || item.metadata?.type) && (
        <StatGrid>
          {topScore != null && <Stat icon={Trophy} label="Puntaje" value={`${topScore} pts`} />}
          {item.metadata?.type && <Stat icon={FlaskConical} label="Tipo" value={item.metadata.type} />}
        </StatGrid>
      )}
      <div className="mt-3 px-1">
        <DateLine icon={CalendarClock} label="Disponible desde" value={fmtDateTime(item.visibleFrom)} />
      </div>
      {item.description && <Section icon={FileText} title="Descripción" html={item.description} />}
    </div>
  );
}

export function ActivityDetailModal({
  kind,
  courseId,
  sectionId,
  item,
  onClose,
}: {
  kind: Kind;
  courseId: string;
  sectionId: string;
  item: ActivityContent | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      size={kind === 'forums' ? 'xl' : 'lg'}
      title={item?.title}
      subtitle={item?.contentDetail?.weekNumber != null ? `Semana ${item.contentDetail.weekNumber}` : undefined}
    >
      {item &&
        (kind === 'homework' ? (
          <HomeworkBody sectionId={sectionId} item={item} />
        ) : kind === 'forums' ? (
          <ForumBody courseId={courseId} sectionId={sectionId} id={item.id} />
        ) : (
          <EvaluationBody item={item} />
        ))}
    </Modal>
  );
}
