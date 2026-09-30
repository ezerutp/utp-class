import type { Endpoints } from './api';
import type { ActivityContent, Content, GradeRow } from '../types/api';
import { fmtDateTime, fmtDate, fmtDuration, stripHtml, toDate } from './format';
import { activeWeek } from './week';

export type AssistantTab = 'notas' | 'tareas' | 'foros' | 'evaluaciones' | 'contenido';

export interface GradeItem {
  title: string;
  kind: string;
  week: number;
  /** null = sin calificar */
  score: number | null;
  top: number;
}

/** Respuesta del asistente: markdown + (opcional) tarjeta de notas y boton para abrir una pestaña. */
export interface Answer {
  text: string;
  grades?: { avg: string | null; graded: number; total: number; items: GradeItem[] };
  action?: { tab: AssistantTab; label: string };
}

interface Ctx {
  api: Endpoints;
  courseId: string;
  sectionId: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/* ---------- Interpretacion de la pregunta ---------- */

type Status = 'pending' | 'overdue' | 'delivered';

interface Query {
  /** Semana pedida (por defecto, la semana activa). null si se pidio todo el curso. */
  week: number | null;
  all: boolean;
  status: Status | null;
  /** Se muestra todo el curso porque el ciclo ya termino y no se pidio una semana. */
  assumedAll: boolean;
}

/**
 * Entiende "esta semana", "semana pasada", "semana 5", "hace 2 semanas", "todas",
 * y filtros de estado (pendiente / vencida / entregada). Sin indicacion => semana activa.
 */
function parseQuery(question: string, current: number, ended: boolean): Query {
  const q = norm(question);

  let week: number | null = null;
  const ago = q.match(/hace\s*(\d{1,2})\s*semanas?/);
  const abs = q.match(/semana\s*(?:n(?:umero)?\.?\s*)?(\d{1,2})|(?:^|\s)s(\d{1,2})(?:\s|$)/);
  if (ago) week = current - Number(ago[1]);
  else if (/antepasada/.test(q)) week = current - 2;
  else if (/semana (pasada|anterior|previa|que paso)|ultima semana/.test(q)) week = current - 1;
  else if (/(proxima|siguiente) semana|semana (proxima|siguiente|que viene)/.test(q)) week = current + 1;
  else if (abs) week = Number(abs[1] ?? abs[2]);
  else if (/esta semana|semana actual|semana en curso/.test(q)) week = current;

  const status: Status | null = /vencid|atrasad|no entregu|no he entregado|perdi/.test(q)
    ? 'overdue'
    : /entregad|ya entregu|complet|realizad/.test(q)
      ? 'delivered'
      : /pendient|por entregar|falta|debo|tengo que|por hacer/.test(q)
        ? 'pending'
        : null;

  let all = week == null && /\b(todas?|todos?|completos?|historial|en total)\b/.test(q);
  let assumedAll = false;
  if (week == null && !all) {
    // Vencidas y entregadas tienen sentido en todo el curso; lo demas, en la semana activa
    // (o en todo el curso si el ciclo ya termino y no hay semana activa).
    if (status === 'overdue' || status === 'delivered') all = true;
    else if (ended) {
      all = true;
      assumedAll = true;
    } else week = current;
  }
  return { week, all, status, assumedAll };
}

function scopeLabel(q: Query, current: number): string {
  if (q.all || q.week == null) return 'todo el curso';
  const d = q.week - current;
  const tag = d === 0 ? 'esta semana' : d === -1 ? 'semana pasada' : d === 1 ? 'próxima semana' : '';
  return `Semana ${q.week}${tag ? ` (${tag})` : ''}`;
}

/* ---------- Actividades (tareas, foros, evaluaciones) ---------- */

function isOverdue(a: ActivityContent) {
  const end = toDate(a.visibleTo);
  return !!end && end.getTime() < Date.now();
}

function statusOf(a: ActivityContent): Status {
  if (a.statusActivityStudent === 'DELIVERED') return 'delivered';
  return isOverdue(a) ? 'overdue' : 'pending';
}

const STATUS_TEXT: Record<Status, string> = {
  delivered: '✅ Entregado',
  overdue: '⛔ Vencido',
  pending: '🕗 Pendiente',
};

const weekOf = (a: ActivityContent) => a.contentDetail?.weekNumber ?? null;

function dueText(a: ActivityContent, status: Status): string {
  const end = toDate(a.visibleTo);
  if (!end) return '';
  if (status === 'pending') return `vence en ${fmtDuration(end.getTime() - Date.now())} · ${fmtDateTime(a.visibleTo)}`;
  if (status === 'overdue') return `venció el ${fmtDate(a.visibleTo)}`;
  return '';
}

function activityLines(items: ActivityContent[]): string {
  return items
    .slice()
    .sort(
      (a, b) =>
        (weekOf(a) ?? 0) - (weekOf(b) ?? 0) ||
        (toDate(a.visibleTo)?.getTime() ?? 0) - (toDate(b.visibleTo)?.getTime() ?? 0),
    )
    .map((a) => {
      const st = statusOf(a);
      const due = dueText(a, st);
      return `- **${a.title}**\n  ${STATUS_TEXT[st]}${due ? ` · ${due}` : ''}`;
    })
    .join('\n');
}

/** Agrupa por semana cuando se pide todo el curso. */
function groupedByWeek(items: ActivityContent[]): string {
  const weeks = [...new Set(items.map((a) => weekOf(a) ?? 0))].sort((a, b) => a - b);
  return weeks
    .map((w) => `**${w ? `Semana ${w}` : 'General'}**\n${activityLines(items.filter((a) => (weekOf(a) ?? 0) === w))}`)
    .join('\n\n');
}

const matchStatus = (a: ActivityContent, q: Query) => !q.status || statusOf(a) === q.status;
const matchScope = (a: ActivityContent, q: Query) => q.all || q.week == null || weekOf(a) === q.week;

interface KindInfo {
  title: string;
  plural: string;
  fem: boolean;
}

const STATUS_WORD = (fem: boolean): Record<Status, string> => ({
  pending: fem ? 'pendientes' : 'pendientes',
  overdue: fem ? 'vencidas' : 'vencidos',
  delivered: fem ? 'entregadas' : 'entregados',
});

function activityAnswer(info: KindInfo, items: ActivityContent[], q: Query, current: number): string {
  const shown = items.filter((a) => matchScope(a, q) && matchStatus(a, q));
  const scope = scopeLabel(q, current);
  const word = q.status ? STATUS_WORD(info.fem)[q.status] : '';
  const header = `**${info.title}${word ? ` ${word}` : ''}** · ${scope}${shown.length ? ` (${shown.length})` : ''}`;

  let body: string;
  if (shown.length === 0) {
    const where = q.all ? '' : ` en la ${scope}`;
    body =
      q.status === 'pending'
        ? `No tienes ${info.plural} pendientes${where} 🎉`
        : `No encontré ${info.plural}${word ? ` ${word}` : ''}${where}.`;
  } else {
    body = q.all ? groupedByWeek(shown) : activityLines(shown);
  }

  let hint = '';
  if (!q.all) {
    const others = items.filter((a) => !matchScope(a, q) && matchStatus(a, q)).length;
    if (others > 0) {
      hint = `\n\n_Hay ${others} ${info.plural}${word ? ` ${word}` : ''} en otras semanas. Pídeme «todas las ${info.plural}» o indica una semana._`;
    }
  }
  return `${header}\n\n${body}${hint}`;
}

/* ---------- Materiales ---------- */

function materialLines(contents: Content[]): string {
  return contents
    .map((c) => {
      const url = c.metadata?.url;
      const name = c.title || c.metadata?.title || 'Material';
      const kind = c.type === 'FILE' ? (c.metadata?.filetype?.toUpperCase() ?? 'Archivo') : 'Enlace';
      return url ? `- [${name}](${url})\n  ${kind}` : `- ${name}\n  ${kind}`;
    })
    .join('\n');
}

function materialsAnswer(contents: Content[], q: Query, current: number): string {
  const mats = contents.filter((c) => (c.type === 'FILE' || c.type === 'URL') && c.isVisible);
  const shown = q.all || q.week == null ? mats : mats.filter((c) => c.weekNumber === q.week);
  const scope = scopeLabel(q, current);
  if (shown.length === 0) {
    return `**Materiales** · ${scope}\n\nNo encontré materiales${q.all ? '' : ` en la ${scope}`}.`;
  }
  let body: string;
  if (q.all) {
    const weeks = [...new Set(shown.map((c) => c.weekNumber ?? 0))].sort((a, b) => a - b);
    body = weeks
      .map((w) => `**${w ? `Semana ${w}` : 'General'}**\n${materialLines(shown.filter((c) => (c.weekNumber ?? 0) === w))}`)
      .join('\n\n');
  } else {
    body = materialLines(shown);
  }
  const others = q.all ? 0 : mats.length - shown.length;
  const hint = others > 0 ? `\n\n_Hay ${others} materiales en otras semanas. Pídeme «todos los materiales» o indica una semana._` : '';
  return `**Materiales** · ${scope} (${shown.length})\n\n${body}${hint}`;
}

/* ---------- Notas ---------- */

function gradesAnswer(rows: GradeRow[], q: Query, explicitWeek: boolean, link: boolean): Answer {
  const action = { tab: 'notas' as const, label: 'Ver todas mis notas' };
  const qualified = rows
    .filter((r) => r.isQualificated)
    .filter((r) => !explicitWeek || q.week == null || r.weekNumber === q.week)
    .sort((a, b) => a.weekNumber - b.weekNumber);
  if (qualified.length === 0) return { text: '**Notas**\n\nAún no hay notas registradas.', action };

  const isGraded = (r: GradeRow) => r.gradeStatus === 'GRADED' && r.grade != null;
  const graded = qualified.filter(isGraded);
  const avg = graded.length ? (graded.reduce((s, r) => s + (r.grade ?? 0), 0) / graded.length).toFixed(1) : null;

  return {
    text: link ? 'Aquí tienes tus notas, con acceso directo a la pestaña completa.' : 'Estas son tus notas:',
    grades: {
      avg,
      graded: graded.length,
      total: qualified.length,
      items: qualified.map((r) => ({
        title: r.activityTitle,
        kind: r.type,
        week: r.weekNumber,
        score: isGraded(r) ? (r.grade as number) : null,
        top: r.evaluationTopScore || 20,
      })),
    },
    action,
  };
}

/* ---------- Resumen ---------- */

async function summaryAnswer(ctx: Ctx, q: Query, current: number, contents: Content[]): Promise<string> {
  const { api, courseId, sectionId } = ctx;
  const [hw, fo, ev] = await Promise.all([
    api.homework(courseId, sectionId),
    api.forums(courseId, sectionId),
    api.evaluations(courseId, sectionId),
  ]);
  const groups: [string, ActivityContent[]][] = [
    ['Tareas', hw.content ?? []],
    ['Foros', fo.content ?? []],
    ['Evaluaciones', ev.content ?? []],
  ];
  const parts = groups
    .map(([title, items]) => {
      const shown = items.filter((a) => matchScope(a, q) && matchStatus(a, q));
      return shown.length ? `**${title}** (${shown.length})\n${q.all ? groupedByWeek(shown) : activityLines(shown)}` : '';
    })
    .filter(Boolean);

  if (!q.status) {
    const mats = contents.filter(
      (c) => (c.type === 'FILE' || c.type === 'URL') && c.isVisible && (q.all || q.week == null || c.weekNumber === q.week),
    );
    if (mats.length) parts.push(`**Materiales** (${mats.length})\n${materialLines(mats)}`);
  }

  const word = q.status ? ` · ${STATUS_WORD(false)[q.status]}` : '';
  const header = `**Resumen** · ${scopeLabel(q, current)}${word}`;
  if (parts.length === 0) {
    return `${header}\n\n${q.status === 'pending' ? 'No tienes nada pendiente 🎉' : 'No encontré actividades.'}`;
  }
  return `${header}\n\n${parts.join('\n\n')}`;
}

/**
 * Intenta responder con los datos reales del alumno. Sin indicacion, asume la semana
 * activa; entiende "semana pasada", "semana 5", "todas", "pendientes", etc. Devuelve
 * null si la pregunta no encaja (para caer al asistente unibot).
 */
export async function answerLocally(question: string, ctx: Ctx): Promise<Answer | null> {
  const q = norm(question);
  const { api, courseId, sectionId } = ctx;
  const has = (...w: string[]) => w.some((x) => q.includes(x));
  const hasRe = (re: RegExp) => re.test(q);

  const isGrades = has('nota', 'promedio', 'calificacion', 'calificaciones', 'cuanto saque');
  const isHomework = has('tarea', 'homework', 'entrega');
  const isForum = has('foro');
  const isEval = has('evaluacion', 'examen', 'practica', 'quiz') || hasRe(/\bpc\d?\b/);
  const isMaterial = has('material', 'contenido', 'pdf', 'lectura', 'diapositiva', 'recurso');
  const isSummary =
    has('resumen', 'agenda', 'actividades', 'que tengo', 'que hay', 'que toca', 'pendiente', 'por hacer') ||
    (has('semana') && has('que '));
  const wantsLink = has('link', 'enlace', 'donde', 'llevame', 'abrir', 'ir a ');

  if (!(isGrades || isHomework || isForum || isEval || isMaterial || isSummary)) return null;

  try {
    const sec = await api.sectionFull(courseId, sectionId);
    const aw = activeWeek(sec);
    const current = aw.week;
    const query = parseQuery(question, current, aw.ended);
    // weekNumber vive en el tema, no en el contenido (ahi suele venir null): heredarlo.
    const contents = (sec.unities ?? [])
      .flatMap((u) => u.themes ?? [])
      .flatMap((t) => (t.contents ?? []).map((c) => ({ ...c, weekNumber: c.weekNumber ?? t.weekNumber })));

    if (isGrades) {
      const explicit = !query.all && /semana/.test(q);
      return gradesAnswer(await api.grades(sectionId), query, explicit, wantsLink);
    }

    let text: string;
    let action: Answer['action'];
    if (isHomework) {
      const r = await api.homework(courseId, sectionId);
      text = activityAnswer({ title: 'Tareas', plural: 'tareas', fem: true }, r.content ?? [], query, current);
      action = { tab: 'tareas', label: 'Abrir Tareas' };
    } else if (isForum) {
      const r = await api.forums(courseId, sectionId);
      text = activityAnswer({ title: 'Foros', plural: 'foros', fem: false }, r.content ?? [], query, current);
      action = { tab: 'foros', label: 'Abrir Foros' };
    } else if (isEval) {
      const r = await api.evaluations(courseId, sectionId);
      text = activityAnswer({ title: 'Evaluaciones', plural: 'evaluaciones', fem: true }, r.content ?? [], query, current);
      action = { tab: 'evaluaciones', label: 'Abrir Evaluaciones' };
    } else if (isMaterial) {
      text = materialsAnswer(contents, query, current);
      action = { tab: 'contenido', label: 'Abrir Contenido' };
    } else {
      text = await summaryAnswer(ctx, query, current, contents);
    }

    if (query.assumedAll) {
      const [head, ...rest] = text.split('\n\n');
      text = [head, '_El ciclo ya terminó, así que te muestro todo el curso._', ...rest].join('\n\n');
    }
    return { text, action };
  } catch {
    return null; // ante error, dejar que responda unibot
  }
}

export { stripHtml, fmtDate };
