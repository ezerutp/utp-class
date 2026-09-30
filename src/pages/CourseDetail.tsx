import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../lib/useApi';
import { useAsync } from '../lib/useAsync';
import type { CourseInternal, SectionDetail, SectionProgress } from '../types/api';
import { Loading, ErrorState } from '../components/StateBlock';
import { Progress } from '../components/ui';
import { modalityLabel } from '../lib/modality';
import { activeWeek } from '../lib/week';
import { EASE_OUT } from '../lib/motion';
import { ContentTab } from '../components/tabs/ContentTab';
import { ActivitiesTab } from '../components/tabs/ActivitiesTab';
import { GradesTab } from '../components/tabs/GradesTab';
import { ZoomTab } from '../components/tabs/ZoomTab';
import { SyllabusTab } from '../components/tabs/SyllabusTab';
import { AnnouncementsTab } from '../components/tabs/AnnouncementsTab';
import { Assistant } from '../components/Assistant';

type TabId =
  | 'contenido'
  | 'silabo'
  | 'evaluaciones'
  | 'tareas'
  | 'foros'
  | 'notas'
  | 'anuncios'
  | 'zoom';

const TABS: { id: TabId; label: string }[] = [
  { id: 'silabo', label: 'Sílabo' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'evaluaciones', label: 'Evaluaciones' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'foros', label: 'Foros' },
  { id: 'notas', label: 'Notas' },
  { id: 'anuncios', label: 'Anuncios' },
  { id: 'zoom', label: 'Zoom' },
];

function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">{k}</div>
      <div className="mt-0.5 text-[15px] font-bold">{v}</div>
    </div>
  );
}

export function CourseDetail() {
  const { courseId, sectionId } = useParams<{ courseId: string; sectionId: string }>();
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = (location.state as { tab?: TabId } | null)?.tab ?? 'contenido';
  const [tab, setTab] = useState<TabId>(initialTab);

  const head = useAsync<{
    info: CourseInternal | null;
    section: SectionDetail;
    progress: SectionProgress | null;
  }>(async () => {
    const [info, section, progress] = await Promise.all([
      api.courseInternal(courseId!).catch(() => null),
      api.sectionFull(courseId!, sectionId!),
      api.sectionProgress(courseId!, sectionId!).catch(() => null),
    ]);
    return { info, section, progress };
  }, [courseId, sectionId]);

  if (head.loading) return <Loading label="Cargando curso…" />;
  if (head.error || !head.data) {
    return (
      <div>
        <BackLink onClick={() => navigate('/')} />
        <ErrorState error={head.error || 'No se encontró la sección.'} />
      </div>
    );
  }

  const { info, section, progress } = head.data;
  const name = info?.name ?? 'Curso';
  const aw = activeWeek(section);

  return (
    <div>
      <BackLink onClick={() => navigate('/')} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="relative mt-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-surface p-6 card-shadow"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 to-brand-600" />
        <div className="text-[12px] font-bold uppercase tracking-wide text-brand-600">
          {info?.code ?? section.sectionCode} · Sección {section.classNumber}
        </div>
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight">{name}</h1>

        <div className="mt-4 flex max-w-md items-center gap-3">
          <Progress value={progress?.value ?? 0} className="flex-1" />
          <span className="text-[13px] font-bold tabular-nums text-fg-muted">
            {(progress?.value ?? 0).toFixed(0)}%
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 md:grid-cols-6">
          <Stat k="Ciclo" v={section.cycle} />
          <Stat
            k="Semana"
            v={aw.ended ? 'Finalizado' : aw.notStarted ? 'Por iniciar' : `${aw.week} / ${aw.total}`}
          />
          <Stat k="Temas" v={section.numThemes} />
          <Stat k="Modalidad" v={modalityLabel(section.modality)} />
          <Stat k="Campus" v={section.campus} />
          <Stat k="Periodo" v={section.period} />
        </div>
      </motion.div>

      {/* Tabs */}
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 px-3.5 py-2.5 text-[14px] font-semibold transition-colors ${
              tab === t.id ? 'text-brand-600' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600"
                transition={{ duration: 0.25, ease: EASE_OUT }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Panel */}
      <div className="pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            {tab === 'silabo' && <SyllabusTab courseId={courseId!} sectionId={sectionId!} />}
            {tab === 'contenido' && (
              <ContentTab
                unities={section.unities ?? []}
                courseId={courseId!}
                sectionId={sectionId!}
                onGoToTab={setTab}
              />
            )}
            {tab === 'evaluaciones' && (
              <ActivitiesTab kind="evaluations" courseId={courseId!} sectionId={sectionId!} />
            )}
            {tab === 'tareas' && (
              <ActivitiesTab kind="homework" courseId={courseId!} sectionId={sectionId!} />
            )}
            {tab === 'foros' && (
              <ActivitiesTab kind="forums" courseId={courseId!} sectionId={sectionId!} />
            )}
            {tab === 'notas' && <GradesTab sectionId={sectionId!} />}
            {tab === 'anuncios' && (
              <AnnouncementsTab
                courseId={courseId!}
                sectionId={sectionId!}
                currentWeek={aw.range ? aw.week : undefined}
                weekRange={aw.range}
              />
            )}
            {tab === 'zoom' && <ZoomTab courseId={courseId!} sectionId={sectionId!} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {(section.hasVirtualAssistant || import.meta.env.DEV) && (
        <Assistant courseId={courseId!} sectionId={sectionId!} courseName={name} onOpenTab={setTab} />
      )}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg cursor-pointer"
    >
      <span className="text-base leading-none">←</span> Volver a cursos
    </button>
  );
}
