import type { Endpoints } from './api';
import type { DashboardCourse } from '../types/api';
import { toDate } from './format';
import { loadStoredPeriod, pickCurrentPeriod } from './period';

export type EventKind = 'class' | 'homework' | 'evaluation' | 'forum';
export type EventStatus = 'delivered' | 'overdue' | 'pending';

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  title: string;
  date: Date;
  courseName: string;
  courseId: string;
  sectionId: string;
  status?: EventStatus;
  week?: number | null;
  zoomLink?: string;
  playUrl?: string;
  /** Id del contenido y de la actividad (tareas/foros/evaluaciones), para abrir su detalle. */
  contentId?: string;
  activityId?: string | null;
  /** Duracion en minutos (solo clases). */
  durationMin?: number;
}

export const KIND_LABEL: Record<EventKind, string> = {
  class: 'Clase',
  homework: 'Tarea',
  evaluation: 'Evaluación',
  forum: 'Foro',
};

const CONTENT_KIND: Record<string, EventKind> = {
  HOMEWORK: 'homework',
  EVALUATION: 'evaluation',
  FORUM: 'forum',
};

/** YYYY-MM-DD en hora local (clave de dia). */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "90" -> 90, "01:30" / "1:30:00" -> 90. Formato no documentado: si no se entiende, 90 min. */
function parseDurationMin(v: string | number | null | undefined): number {
  const s = String(v ?? '').trim();
  let m = NaN;
  if (/^\d+(\.\d+)?$/.test(s)) m = Number(s);
  else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const [h, mm] = s.split(':').map(Number);
    m = h * 60 + mm;
  }
  return m >= 15 && m <= 360 ? m : 90;
}

/**
 * Arma los eventos del calendario con lo que ya expone la API:
 * fechas de entrega de tareas/foros/evaluaciones (contenido del curso) y clases de Zoom.
 * Un curso que falle no bloquea a los demas.
 */
export async function loadCalendarEvents(api: Endpoints, courses: DashboardCourse[]): Promise<CalendarEvent[]> {
  const unique = [...new Map(courses.map((c) => [c.sectionId, c] as const)).values()];

  const perCourse = await Promise.all(
    unique.map(async (c): Promise<CalendarEvent[]> => {
      const [full, zoom] = await Promise.allSettled([
        api.sectionFull(c.courseId, c.sectionId),
        api.zoom(c.courseId, c.sectionId),
      ]);
      const out: CalendarEvent[] = [];
      const base = { courseName: c.name, courseId: c.courseId, sectionId: c.sectionId };

      if (full.status === 'fulfilled') {
        for (const u of full.value.unities ?? []) {
          for (const t of u.themes ?? []) {
            for (const ct of t.contents ?? []) {
              const kind = CONTENT_KIND[ct.type];
              const date = toDate(ct.visibleTo);
              if (!kind || !date || !ct.isVisible) continue;
              const status: EventStatus = ct.isDelivered
                ? 'delivered'
                : date.getTime() < Date.now()
                  ? 'overdue'
                  : 'pending';
              out.push({
                ...base,
                id: `${c.sectionId}:${ct.contentId}`,
                kind,
                title: ct.title || ct.metadata?.title || KIND_LABEL[kind],
                date,
                status,
                week: ct.weekNumber ?? t.weekNumber,
                contentId: ct.contentId,
                activityId: ct.activityId,
              });
            }
          }
        }
      }

      if (zoom.status === 'fulfilled') {
        for (const m of zoom.value.listVideoConferenceResponse ?? []) {
          const date = toDate(m.startAt);
          if (!date) continue;
          out.push({
            ...base,
            id: `zoom:${m.id}`,
            kind: 'class',
            title: m.title,
            date,
            week: /^\d+$/.test(String(m.weekNumber)) ? Number(m.weekNumber) : null,
            zoomLink: m.zoomLink,
            playUrl: m.playUrl,
            durationMin: parseDurationMin(m.duration),
          });
        }
      }
      return out;
    }),
  );

  return perCourse.flat().sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Eventos de los cursos del periodo elegido en "Mis cursos" (o el vigente). */
export async function loadPeriodEvents(api: Endpoints): Promise<{ events: CalendarEvent[]; periodName: string }> {
  const [courses, ps] = await Promise.all([
    api.dashboardCourses(),
    api.academicPeriods().catch(() => ({ academicPeriods: [] })),
  ]);
  const periods = ps.academicPeriods ?? [];
  const stored = loadStoredPeriod();
  const codes = new Set(courses.map((c) => c.period));
  const period = stored && (stored === 'all' || codes.has(stored)) ? stored : pickCurrentPeriod(courses, periods);
  const list = period === 'all' ? courses : courses.filter((c) => c.period === period);
  const name = periods.find((p) => p.period === period)?.name;
  return {
    events: await loadCalendarEvents(api, list),
    periodName: period === 'all' ? 'Todos los periodos' : name ?? period,
  };
}
