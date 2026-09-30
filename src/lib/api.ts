import axios, { AxiosInstance } from 'axios';
import { TENANT_ID, Session } from './auth';
import type {
  ApiEnvelope,
  DashboardCourse,
  AcademicPeriodsData,
  CourseInternal,
  SectionDetail,
  SectionProgress,
  Syllabus,
  ActivitiesResponse,
  GradeRow,
  ZoomData,
  Announcement,
  HomeworkDetail,
  ForumDetail,
  ForumCommentsResponse,
} from '../types/api';

// api-pao responde Access-Control-Allow-Origin: * , se llama directo.
export const API_HOST = 'https://api-pao.utpxpedition.com';

export interface ApiDeps {
  getSession: () => Session | null;
  refresh: () => Promise<string>;
  onAuthError: () => void;
}

export function createApi({ getSession, refresh, onAuthError }: ApiDeps): AxiosInstance {
  const client = axios.create({ baseURL: API_HOST });

  client.interceptors.request.use((config) => {
    const s = getSession();
    config.headers.set('Authorization', `Bearer ${s?.accessToken ?? ''}`);
    config.headers.set('User-Id', s?.userId ?? '');
    config.headers.set('User-Role', s?.role ?? 'STUDENT');
    config.headers.set('User-Id-To-Access', '');
    config.headers.set('User-Role-To-Access', '');
    config.headers.set('X-Tenant-Id', TENANT_ID);
    config.headers.set('Transaction-Id', crypto.randomUUID());
    return config;
  });

  client.interceptors.response.use(
    (r) => r,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && original && !original._retried) {
        original._retried = true;
        try {
          await refresh();
          return client(original);
        } catch {
          onAuthError();
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

// --- Endpoints tipados -------------------------------------------------------

export function makeEndpoints(client: AxiosInstance, userId: string) {
  const unwrap = <T>(p: Promise<{ data: ApiEnvelope<T> }>) => p.then((r) => r.data.data);

  return {
    /** Cursos del dashboard del alumno. */
    dashboardCourses: () =>
      unwrap<DashboardCourse[]>(client.get(`/learning/student/${userId}/dashboard-courses`)),

    /** Periodos academicos del alumno. */
    academicPeriods: () =>
      unwrap<AcademicPeriodsData>(client.get(`/course/student/${userId}/academicperiods`)),

    /** Info general del curso (nombre, codigo, silabo). */
    courseInternal: (courseId: string) =>
      unwrap<CourseInternal>(client.get(`/course/internal/courses/${courseId}`)),

    /** Detalle de la seccion (metadatos: campus, ciclo, semanas, etc.). */
    section: (courseId: string, sectionId: string) =>
      unwrap<SectionDetail>(
        client.get(`/course/student/courses/${courseId}/sections/${sectionId}`),
      ),

    /** Estructura completa de la seccion: unidades, temas, semanas. */
    sectionFull: (courseId: string, sectionId: string) =>
      unwrap<SectionDetail>(
        client.get(`/course/student/courses/${courseId}/sections/${sectionId}/full`),
      ),

    /** Progreso del alumno en la seccion. */
    sectionProgress: (courseId: string, sectionId: string) =>
      unwrap<SectionProgress>(
        client.get(
          `/learning/student/${userId}/courses/${courseId}/sections/${sectionId}/progress`,
        ),
      ),

    /** Silabo del curso (devuelve la URL del PDF). */
    syllabus: (courseId: string, sectionId: string) =>
      unwrap<Syllabus>(
        client.get(`/course/student/courses/${courseId}/sections/${sectionId}/syllabus`),
      ),

    /** Evaluaciones de la seccion. */
    evaluations: (courseId: string, sectionId: string) =>
      unwrap<ActivitiesResponse>(
        client.get(`/course/student/courses/${courseId}/sections/${sectionId}/contents/evaluation/`),
      ),

    /** Tareas de la seccion. */
    homework: (courseId: string, sectionId: string) =>
      unwrap<ActivitiesResponse>(
        client.get(`/course/student/courses/${courseId}/sections/${sectionId}/contents/homework/`),
      ),

    /** Foros de la seccion. */
    forums: (courseId: string, sectionId: string) =>
      unwrap<ActivitiesResponse>(
        client.get(`/course/student/courses/${courseId}/sections/${sectionId}/contents/forum/`),
      ),

    /** Detalle de una tarea (instrucciones, entregables, fechas, intentos). */
    homeworkDetail: (sectionId: string, homeworkId: string) =>
      unwrap<HomeworkDetail>(
        client.get(`/course/student/sections/${sectionId}/homeworks/${homeworkId}/resume`),
      ),

    /** Detalle de un foro (contenido + metadatos). */
    forumDetail: (sectionId: string, forumId: string) =>
      unwrap<ForumDetail>(
        client.get(`/forum/student/sections/${sectionId}/forum/${forumId}/resume`, {
          params: { includeComments: false },
        }),
      ),

    /** Comentarios del foro (paginados, con respuestas anidadas en `children`). */
    forumComments: (courseId: string, sectionId: string, forumId: string, page = 1) =>
      unwrap<ForumCommentsResponse>(
        client.get(
          `/forum/student/${userId}/courses/${courseId}/sections/${sectionId}/forums/${forumId}/comment`,
          { params: { role: 'student', page } },
        ),
      ),

    /** Publica un comentario (o respuesta si se pasa parentId) en el foro. */
    postForumComment: (
      courseId: string,
      sectionId: string,
      forumId: string,
      description: string,
      parentId?: string,
    ) =>
      client
        .post(
          `/forum/student/${userId}/courses/${courseId}/sections/${sectionId}/forums/${forumId}/comment`,
          { parentId: parentId || undefined, description },
        )
        .then((r) => r.data),

    /** Notas: calificaciones de todas las actividades de la seccion. */
    grades: (sectionId: string) =>
      unwrap<GradeRow[]>(client.get(`/course/student/sections/${sectionId}/grade`)),

    /** Salas y grabaciones de Zoom de la seccion. */
    zoom: (courseId: string, sectionId: string) =>
      unwrap<ZoomData>(
        client.get('/course/student/video-conference/meeting', {
          params: { courseId, sectionId },
        }),
      ),

    /** Conteo de notificaciones del alumno (para el badge de la campana). */
    notificationsCount: () =>
      unwrap<{ count: number }>(
        client.get(`/notification/student/notifications/total/user/${userId}`),
      ),

    /** Conteo de mensajes no leídos. */
    unreadMessages: () =>
      unwrap<{ count: number }>(client.get(`/communication/message/from/${userId}/unread/count`)),

    /** Actividades pendientes (resumen global). */
    pendingActivities: () =>
      unwrap<unknown[]>(client.get('/course/student/activities/pending/resume')),

    /** Anuncios del curso (requiere course y sectionId como query params). */
    announcements: (courseId: string, sectionId: string) =>
      unwrap<Announcement[]>(
        client.get(`/communication/student/announcement/reader/${userId}`, {
          params: { course: courseId, sectionId },
        }),
      ),
  };
}

export type Endpoints = ReturnType<typeof makeEndpoints>;
