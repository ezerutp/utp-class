// Tipos derivados de las respuestas reales del API PAO (api-pao.utpxpedition.com).

export interface ApiEnvelope<T> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  idTransaction: string;
}

export interface Teacher {
  teacherId: string;
  teacherFirstName: string;
  teacherLastName: string;
  teacherEmail: string;
  teacherCode: string;
  profilePictureUrl: string | null;
}

// GET /learning/student/{userId}/dashboard-courses
export interface DashboardCourse {
  sectionId: string;
  courseId: string;
  progress: number;
  active: boolean;
  sectionCode: string;
  classroom: unknown | null;
  classNumber: string;
  modality: string;
  teacherId: string;
  acadCareer: string;
  courseCode: string;
  name: string;
  period: string;
  module: string;
  teacherFirstName: string;
  teacherLastName: string;
  teacherEmail: string;
  teacherCode: string;
  profilePictureUrl: string | null;
  teachers: Teacher[];
  tenantId: string;
}

// GET /course/student/{userId}/academicperiods
// type: LATEST_PERIOD = periodo vigente, OLD_PERIOD = pasados, CURRENT_PERIOD = "9999" (ignorar)
export type PeriodType = 'LATEST_PERIOD' | 'OLD_PERIOD' | 'CURRENT_PERIOD' | string;

export interface AcademicPeriod {
  id: string;
  period: string;
  acadCareer: string;
  module: string;
  name: string;
  active: boolean;
  start: string;
  end: string;
  sectionId: string;
  type: PeriodType;
  displaySetting: unknown;
  code: string;
  tenantId: string;
  parsedStartDate: string;
  priority: number;
}

export interface AcademicPeriodsData {
  academicPeriods: AcademicPeriod[];
}

// GET /course/internal/courses/{courseId}
export interface CourseInternal {
  courseId: string;
  code: string;
  name: string;
  description: string | null;
  language: string | null;
  level: string | null;
  contentTypes: unknown[];
  introduction: {
    videoUrl: string | null;
    imageUrl: string | null;
    width: number | null;
    height: number | null;
  };
  achievements: unknown[];
  syllabusUrl: string | null;
}

// GET /course/student/courses/{courseId}/sections/{sectionId}  y  /full

export type ContentType = 'FILE' | 'URL' | 'FORUM' | 'HOMEWORK' | 'EVALUATION' | string;

export interface ContentMetadata {
  url?: string;
  title?: string;
  filename?: string;
  filetype?: string;
  size?: number;
  score?: number;
  topScore?: number;
  isQualified?: boolean;
  type?: string;
}

// Un contenido dentro de un tema (material, enlace, foro, tarea, evaluacion).
export interface Content {
  contentId: string;
  title: string;
  description: string | null;
  order: number;
  type: ContentType;
  status: string;
  metadata: ContentMetadata;
  themeId: string;
  isVisible: boolean;
  isDelivered: boolean;
  isCaduced?: boolean;
  visibleFrom: string | null;
  visibleTo: string | null;
  weekNumber: number | null;
  activityId: string | null;
}

export interface Theme {
  themeId: string;
  name: string;
  order: number;
  duration: number;
  weekNumber: number;
  unityId: string;
  isVisible: boolean;
  isDelivered: boolean;
  deliveredCount: number;
  contents: Content[];
}

export interface Unity {
  unityId: string;
  name: string;
  description: string | null;
  order: number;
  duration: number | null;
  introduction: unknown;
  achievements: unknown[];
  themes: Theme[];
}

export interface SectionDetail {
  sectionId: string;
  sectionCode: string;
  courseId: string;
  classNumber: string;
  teacherId: string;
  campus: string;
  program: string;
  modality: string;
  period: string;
  classroom: unknown | null;
  turn: string;
  module: string;
  faculty: string;
  acadCareer: string;
  cycle: string;
  capacity: unknown | null;
  start: string;
  end: string;
  active: boolean;
  duration: number;
  numThemes: number;
  numWeeks: number;
  currentWeek: number;
  currentWeekDetail: { startWeek: string; endWeek: string };
  teacherIds: string[] | null;
  isProctorizer: boolean;
  hasVirtualAssistant: boolean;
  customizedMessages: unknown[];
  unities?: Unity[];
}

// GET /learning/student/{userId}/courses/{courseId}/sections/{sectionId}/progress
export interface SectionProgress {
  sectionId: string;
  status: string;
  value: number;
  activeUnityId: string | null;
  weeks: { weekNumber: number; status: string }[];
  unities: {
    unityId: string;
    status: string;
    value: number;
    activeThemeId: string | null;
    themes: unknown[];
  }[];
}

// GET /course/student/courses/{c}/sections/{s}/syllabus
export interface Syllabus {
  courseId: string;
  period: string;
  syllabusUrl: string;
}

// GET /course/student/courses/{c}/sections/{s}/contents/{evaluation|homework|forum}/
// Los tres endpoints comparten la misma forma.
export interface TeacherInfo {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  files: unknown[];
}

export interface ActivityContent {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isProgrammed: boolean;
  visibleFrom: string | null;
  visibleTo: string | null;
  isVisible: boolean;
  type: string; // EVALUATION | HOMEWORK | FORUM
  metadata: {
    score?: number;
    topScore?: number;
    isQualified?: boolean;
    type?: string;
    derivables?: unknown;
    publishBeforeViewOthers?: boolean;
  };
  contentDetail: {
    unityId: string;
    themeId: string;
    activityId: string;
    weekNumber: number;
  };
  statusActivityStudent: string; // DELIVERED | MISSING
}

export interface ActivitiesResponse {
  section: SectionDetail;
  evaluationSystem: { id: string; description: string; code: string; courseCode: string }[];
  content: ActivityContent[];
  teacherInfo: TeacherInfo;
  teachersInfo: TeacherInfo[];
}

// GET /course/student/sections/{s}/homeworks/{id}/resume
export interface HomeworkDetail {
  id: string;
  title: string;
  content: string; // HTML: instrucciones
  deliverables: string; // HTML: qué entregar
  availableFrom: string | null;
  availableUntil: string | null;
  evaluationTopScore: number;
  attempts: number;
  qualificationType: string;
  homeworkStatus: string; // OUT_OF_DATE | ...
  assignmentProgress: string; // NOT_STARTED | ...
  assignmentStatus: string;
  isGroup: boolean;
  isQualified: string | boolean;
  files: unknown[];
}

// GET /forum/student/sections/{s}/forum/{id}/resume?includeComments=true
export interface ForumComment {
  id: string;
  comment?: string;
  content?: string;
  authorName?: string;
  createdAt?: string;
  [k: string]: unknown;
}

// GET /forum/student/{u}/courses/{c}/sections/{s}/forums/{id}/comment?role=student&page=N
export interface ForumCommentNode {
  id: string;
  userId: string;
  description: string; // HTML
  parentId: string;
  createdAt: string;
  commentedAt: string; // ya formateado: "28 de marzo del 2026 a las 00:44"
  status: string;
  seen: boolean;
  children: ForumCommentNode[];
  userFirstName: string;
  userLastName: string;
  userCode: string;
  userRole: string; // STUDENT | TEACHER
  userPhotoProfileUrl: string | null;
}

export interface ForumCommentsResponse {
  totalComments: number;
  totalPages: number;
  page: number;
  data: ForumCommentNode[];
}

export interface ForumDetail {
  started: boolean;
  finished: boolean;
  daysToStart: number;
  forum: {
    id: string;
    title: string;
    content: string; // HTML
    publishAt: string | null;
    finishAt: string | null;
    isConsultation: boolean;
    isEvaluated: boolean;
    evaluationTopScore: number;
    status: string;
    files: unknown[];
  };
  comments: ForumComment[] | null;
  grade: number | null;
  status: string;
  forumStatus: string;
}

// GET /course/student/sections/{s}/grade
export interface GradeRow {
  contentId: string;
  type: string;
  activityId: string;
  activityTitle: string;
  activityDescription: string;
  activityStatus: string;
  evaluationTopScore: number;
  publishAt: string | null;
  finishAt: string | null;
  gradeId: string | null;
  gradeStatus: string; // CREATED | GRADED
  grade: number | null;
  feedback: string | null;
  gradeDate: string | null;
  isQualificated: boolean;
  weekNumber: number;
  themeId: string;
  unityId: string;
  activityStatusFinal: string;
  courseName: string;
}

// GET /course/student/video-conference/meeting?courseId={c}&sectionId={s}
export interface ZoomMeeting {
  id: string;
  title: string;
  weekNumber: string;
  description: string;
  startAt: string;
  zoomId: string;
  zoomLink: string;
  duration: string;
  status: string;
  recordingStatus: string;
  playUrl: string;
  liveStatus: string;
  recordingId: string;
  authorFirtsName: string;
  authorLastName: string;
  processing: boolean;
  caduced: boolean;
}

export interface ZoomData {
  sectionAuthors: {
    sectionOwner: string;
    isMoreThatOneAuthor: boolean;
  };
  listVideoConferenceResponse: ZoomMeeting[];
}

// GET /communication/student/announcement/reader/{u}
export interface Announcement {
  id: string;
  seen: boolean;
  announcement: {
    id: string;
    title: string;
    description: string;
    publishAt: string;
    courseId: string;
    classRoomId: string;
    authorId: string;
    authorName: string;
    photoProfileUrl: string;
    email: string;
  };
}

// --- Mensajes ------------------------------------------------------------------

export interface ChatUser {
  userId: string;
  firstName: string;
  lastName: string;
  picture: string | null;
  commonSectionsNumber?: number;
  commonCoursesList?: unknown[];
}

// GET /communication/student/message/from/{u}?page=N&filter=all
export interface Chat {
  id: string;
  userIdFrom: string;
  userIdTo: string;
  lastReceivedAt: string;
  countUnread: number;
  lastMessage: string;
  /** La otra persona de la conversacion. */
  to: ChatUser;
}

// GET /communication/student/message/from/{u}/to/{otro}?page=N  (pagina 1 = mas recientes)
export interface ChatMessage {
  id: string;
  messageId: string;
  userIdFrom: string;
  userIdTo: string;
  createdAt: string;
  message: string;
  fileName: string;
  fileUrl: string;
  withFile: boolean;
}

// GET /user/users/{id}
export interface UserInfo {
  userId: string;
  firstName: string;
  lastName: string;
  picture: string | null;
}
