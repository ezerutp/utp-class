import { useCallback } from 'react';
import { useAuth } from './auth';

// El asistente virtual (unibot) vive en otro host con headers propios
// (Content-Type, authorization, user-role, user-id — SIN X-Tenant-Id ni Transaction-Id).
// En dev se llama a traves del proxy /unibot de Vite.
const BASE = '/unibot';

export interface AssistantReply {
  message: string;
  sessionId: string;
}

interface SendArgs {
  message: string;
  sectionId: string;
  course: { courseId: string; name: string };
  sessionId?: string;
}

const FALLBACK =
  'No pudimos procesar tu consulta en este momento. Intenta nuevamente en unos segundos.';

/** Extrae {message, sessionId} de las distintas formas que devuelve unibot. */
function parseReply(json: unknown, prevSession = ''): AssistantReply {
  const j = json as {
    messages?: { content?: string }[];
    message?: string;
    data?: { messages?: { content?: string }[]; message?: string; sessionId?: string };
    sessionId?: string;
    error?: string;
  } | null;
  const src = j?.data ?? j ?? {};
  const message =
    src.messages?.[0]?.content ?? (src as { message?: string }).message ?? j?.error ?? FALLBACK;
  const sessionId = (src as { sessionId?: string }).sessionId ?? j?.sessionId ?? prevSession;
  return { message, sessionId };
}

export function useAssistant() {
  const { session } = useAuth();

  const headers = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      authorization: `Bearer ${session?.accessToken ?? ''}`,
      'user-role': session?.role ?? 'STUDENT',
      'user-id': session?.userId ?? '',
    }),
    [session],
  );

  /** Envia un mensaje al asistente del curso y devuelve su respuesta. */
  const send = useCallback(
    async (args: SendArgs): Promise<AssistantReply> => {
      const body = {
        message: args.message,
        role: 'student',
        userId: session?.userId ?? '',
        sectionId: args.sectionId,
        course: {
          courseId: args.course.courseId || 'general',
          name: args.course.name || 'General',
        },
        ...(args.sessionId ? { sessionId: args.sessionId } : {}),
      };
      const res = await fetch(`${BASE}/chat-student`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      return parseReply(json, args.sessionId);
    },
    [headers, session?.userId],
  );

  /** Cupo de preguntas restante para el curso/seccion. */
  const quota = useCallback(
    async (courseId: string, sectionId: string): Promise<unknown> => {
      const res = await fetch(
        `${BASE}/chat-count?courseId=${encodeURIComponent(courseId)}&sectionId=${encodeURIComponent(
          sectionId,
        )}`,
        { headers: headers() },
      );
      return res.json().catch(() => null);
    },
    [headers],
  );

  return { send, quota };
}
