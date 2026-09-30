import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
  Chat,
  ChatMessage,
  UserInfo,
} from '../types/api';

// api-pao responde Access-Control-Allow-Origin: * , se llama directo.
export const API_HOST = 'https://api-pao.utpxpedition.com';

export interface ApiDeps {
  getSession: () => Session | null;
  refresh: () => Promise<string>;
  onAuthError: () => void;
}

// Fallos transitorios: sin respuesta (axios "Network Error", corte o timeout) o el API saturado.
// Solo se reintentan GET, y una sola vez: el API limita peticiones y reintentar de mas alarga el bloqueo.
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      const status = error.response?.status;
      const transient = !error.response || RETRY_STATUS.has(status);
      if (transient && original && original.method === 'get' && !axios.isCancel(error)) {
        const attempt = original._netRetries ?? 0;
        if (attempt < RETRY_DELAYS_MS.length) {
          original._netRetries = attempt + 1;
          await sleep(RETRY_DELAYS_MS[attempt]);
          return client(original);
        }
      }
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

// --- Cache de GETs ------------------------------------------------------------

// Las paginas piden los mismos datos una y otra vez (cursos, /full de cada seccion...). Se guardan
// en memoria unos minutos y las peticiones identicas en curso se comparten (tambien evita el doble
// efecto de StrictMode en dev). Los errores no se guardan.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; p: Promise<{ data: unknown }> }>();

function cachedGet<T>(client: AxiosInstance, userId: string, url: string, config?: AxiosRequestConfig) {
  const key = `${userId} ${url} ${JSON.stringify(config?.params ?? {})}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.p as Promise<{ data: T }>;
  const p = client.get<T>(url, config);
  cache.set(key, { at: Date.now(), p });
  p.catch(() => cache.get(key)?.p === p && cache.delete(key));
  return p;
}

/** Descarta del cache las entradas cuya URL contiene `fragment` (tras una escritura). */
function invalidate(fragment: string) {
  for (const key of cache.keys()) if (key.includes(fragment)) cache.delete(key);
}

// --- Endpoints tipados -------------------------------------------------------

export function makeEndpoints(client: AxiosInstance, userId: string) {
  const unwrap = <T>(p: Promise<{ data: ApiEnvelope<T> }>) => p.then((r) => r.data.data);
  const get = <T>(url: string, config?: AxiosRequestConfig) => cachedGet<T>(client, userId, url, config);

  return {
    /** Cursos del dashboard del alumno. */
    dashboardCourses: () =>
      unwrap<DashboardCourse[]>(get(`/learning/student/${userId}/dashboard-courses`)),

    /** Periodos academicos del alumno. */
    academicPeriods: () =>
      unwrap<AcademicPeriodsData>(get(`/course/student/${userId}/academicperiods`)),

    /** Info general del curso (nombre, codigo, silabo). */
    courseInternal: (courseId: string) =>
      unwrap<CourseInternal>(get(`/course/internal/courses/${courseId}`)),

    /** Detalle de la seccion (metadatos: campus, ciclo, semanas, etc.). */
    section: (courseId: string, sectionId: string) =>
      unwrap<SectionDetail>(
        get(`/course/student/courses/${courseId}/sections/${sectionId}`),
      ),

    /** Estructura completa de la seccion: unidades, temas, semanas. */
    sectionFull: (courseId: string, sectionId: string) =>
      unwrap<SectionDetail>(
        get(`/course/student/courses/${courseId}/sections/${sectionId}/full`),
      ),

    /** Progreso del alumno en la seccion. */
    sectionProgress: (courseId: string, sectionId: string) =>
      unwrap<SectionProgress>(
        get(
          `/learning/student/${userId}/courses/${courseId}/sections/${sectionId}/progress`,
        ),
      ),

    /** Silabo del curso (devuelve la URL del PDF). */
    syllabus: (courseId: string, sectionId: string) =>
      unwrap<Syllabus>(
        get(`/course/student/courses/${courseId}/sections/${sectionId}/syllabus`),
      ),

    /** Evaluaciones de la seccion. */
    evaluations: (courseId: string, sectionId: string) =>
      unwrap<ActivitiesResponse>(
        get(`/course/student/courses/${courseId}/sections/${sectionId}/contents/evaluation/`),
      ),

    /** Tareas de la seccion. */
    homework: (courseId: string, sectionId: string) =>
      unwrap<ActivitiesResponse>(
        get(`/course/student/courses/${courseId}/sections/${sectionId}/contents/homework/`),
      ),

    /** Foros de la seccion. */
    forums: (courseId: string, sectionId: string) =>
      unwrap<ActivitiesResponse>(
        get(`/course/student/courses/${courseId}/sections/${sectionId}/contents/forum/`),
      ),

    /** Detalle de una tarea (instrucciones, entregables, fechas, intentos). */
    homeworkDetail: (sectionId: string, homeworkId: string) =>
      unwrap<HomeworkDetail>(
        get(`/course/student/sections/${sectionId}/homeworks/${homeworkId}/resume`),
      ),

    /** Detalle de un foro (contenido + metadatos). */
    forumDetail: (sectionId: string, forumId: string) =>
      unwrap<ForumDetail>(
        get(`/forum/student/sections/${sectionId}/forum/${forumId}/resume`, {
          params: { includeComments: false },
        }),
      ),

    /** Comentarios del foro (paginados, con respuestas anidadas en `children`). */
    forumComments: (courseId: string, sectionId: string, forumId: string, page = 1) =>
      unwrap<ForumCommentsResponse>(
        get(
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
        .then((r) => {
          invalidate(`/forums/${forumId}/comment`);
          return r.data;
        }),

    /** Notas: calificaciones de todas las actividades de la seccion. */
    grades: (sectionId: string) =>
      unwrap<GradeRow[]>(get(`/course/student/sections/${sectionId}/grade`)),

    /** Salas y grabaciones de Zoom de la seccion. */
    zoom: (courseId: string, sectionId: string) =>
      unwrap<ZoomData>(
        get('/course/student/video-conference/meeting', {
          params: { courseId, sectionId },
        }),
      ),

    /** Conteo de notificaciones del alumno (para el badge de la campana). */
    notificationsCount: () =>
      unwrap<{ count: number }>(
        get(`/notification/student/notifications/total/user/${userId}`),
      ),

    /** Conteo de mensajes no leídos (sin cache: cambia seguido). */
    unreadMessages: () =>
      unwrap<{ count: number }>(client.get(`/communication/message/from/${userId}/unread/count`)),

    // --- Mensajes (sin cache: una conversacion tiene que verse al dia) ---

    /** Conversaciones del alumno, la mas reciente primero. */
    chats: (page = 1) =>
      unwrap<Chat[]>(
        client.get(`/communication/student/message/from/${userId}`, { params: { page, filter: 'all' } }),
      ),

    /** Mensajes con otra persona. La pagina 1 trae los mas recientes (orden: nuevo -> viejo). */
    chatMessages: (toUserId: string, page = 1) =>
      unwrap<ChatMessage[]>(
        client.get(`/communication/student/message/from/${userId}/to/${toUserId}`, { params: { page } }),
      ),

    /** Marca la conversacion como leida. */
    markChatRead: (toUserId: string) =>
      client.patch(`/communication/student/message/from/${userId}/to/${toUserId}/reset-count`),

    /** Envia un mensaje de texto. */
    sendMessage: (toUserId: string, message: string) =>
      unwrap<ChatMessage>(
        client.post(`/communication/student/message/from/${userId}/to/${toUserId}`, { message }),
      ),

    /** Nombre y foto de un usuario (docente o alumno). */
    user: (id: string) => unwrap<UserInfo>(get(`/user/users/${id}`)),

    /** Actividades pendientes (resumen global). */
    pendingActivities: () =>
      unwrap<unknown[]>(get('/course/student/activities/pending/resume')),

    /** Anuncios del curso (requiere course y sectionId como query params). */
    announcements: (courseId: string, sectionId: string) =>
      unwrap<Announcement[]>(
        get(`/communication/student/announcement/reader/${userId}`, {
          params: { course: courseId, sectionId },
        }),
      ),
  };
}

export type Endpoints = ReturnType<typeof makeEndpoints>;
