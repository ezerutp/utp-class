import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  ChevronLeft,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  MessageSquarePlus,
  MessagesSquare,
  Paperclip,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import type { Chat, ChatMessage, ChatUser, DashboardCourse } from '../types/api';
import { toDate } from '../lib/format';
import { cn } from '../lib/cn';
import { EASE_OUT } from '../lib/motion';
import { Button, Skeleton, Spinner } from '../components/ui';
import { ErrorState } from '../components/StateBlock';
import { FilePreview, fileKind, type FileKind } from '../components/FilePreview';

const fullName = (u?: Pick<ChatUser, 'firstName' | 'lastName'> | null) =>
  u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase() : '';

function initials(u?: Pick<ChatUser, 'firstName' | 'lastName'> | null) {
  return ((u?.firstName?.[0] ?? '') + (u?.lastName?.[0] ?? '')).toUpperCase() || '?';
}

function Avatar({ user, className = 'size-10' }: { user?: ChatUser | null; className?: string }) {
  if (user?.picture) return <img src={user.picture} alt="" className={cn('shrink-0 rounded-full object-cover', className)} />;
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand-600/10 text-[12px] font-bold text-brand-600 dark:text-brand-300',
        className,
      )}
    >
      {initials(user)}
    </span>
  );
}

/** "14:05" si es hoy, "ayer", "lun", o "29/05". */
function shortWhen(s: string) {
  const d = toDate(s);
  if (!d) return '';
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5);
  if (days <= 0) return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'ayer';
  if (days < 7) return d.toLocaleDateString('es-PE', { weekday: 'short' });
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
}

function dayLabel(d: Date) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  if (d.toDateString() === today) return 'Hoy';
  if (d.toDateString() === yesterday) return 'Ayer';
  const s = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Texto del mensaje con los enlaces clicables. */
function Linkified({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            className={cn('underline underline-offset-2 [overflow-wrap:anywhere]', mine ? 'text-white' : 'text-brand-600')}
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

const KIND_ICON: Record<FileKind, LucideIcon> = {
  image: FileImage,
  pdf: FileText,
  video: FileVideo,
  audio: FileAudio,
  office: FileSpreadsheet,
  other: Paperclip,
};

/** Adjunto de un mensaje: miniatura si es imagen, tarjeta si no. Abre la vista previa. */
function Attachment({ m, mine, onOpen }: { m: ChatMessage; mine: boolean; onOpen: () => void }) {
  const name = m.fileName || 'Archivo adjunto';
  const kind = fileKind(name, m.fileUrl);
  const [thumbFailed, setThumbFailed] = useState(false);
  if (kind === 'image' && !thumbFailed) {
    return (
      <button onClick={onOpen} className="mt-1.5 block overflow-hidden rounded-xl cursor-zoom-in" title={name}>
        <img
          src={m.fileUrl}
          alt={name}
          loading="lazy"
          onError={() => setThumbFailed(true)}
          className="max-h-56 w-auto max-w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
        />
      </button>
    );
  }
  const Icon = KIND_ICON[kind];
  return (
    <button
      onClick={onOpen}
      className={cn(
        'mt-1.5 flex w-full min-w-[200px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer',
        mine ? 'bg-white/15 hover:bg-white/25' : 'bg-surface-2 hover:bg-[var(--border)]',
      )}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', mine ? 'bg-white/20' : 'bg-brand-600/10 text-brand-600')}>
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className={cn('text-[11px]', mine ? 'text-white/75' : 'text-fg-faint')}>Ver archivo</span>
      </span>
    </button>
  );
}

/* ---------- Lista de conversaciones ---------- */

export function ChatList({
  chats,
  selected,
  onSelect,
  onNew,
}: {
  chats: Chat[] | null;
  selected: string | null;
  onSelect: (userId: string) => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (chats ?? []).filter((c) => !term || fullName(c.to).includes(term) || c.lastMessage?.toLowerCase().includes(term));
  }, [chats, q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar conversación"
            className="h-9 w-full rounded-xl border border-[var(--border-strong)] bg-surface pl-9 pr-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <button
          onClick={onNew}
          aria-label="Nuevo mensaje"
          title="Nuevo mensaje"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-[background-color,transform] duration-150 hover:bg-brand-700 active:scale-95 cursor-pointer"
        >
          <MessageSquarePlus size={17} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {!chats ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="mt-2 h-3 w-4/5" />
              </div>
            </div>
          ))
        ) : shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-fg-faint">
            {chats.length === 0 ? 'Aún no tienes conversaciones.' : 'Nada coincide con la búsqueda.'}
          </p>
        ) : (
          shown.map((c) => {
            const active = c.to.userId === selected;
            // La conversacion abierta ya se marco como leida.
            const unread = !active && c.countUnread > 0;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.to.userId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors cursor-pointer',
                  active ? 'bg-brand-600/10' : 'hover:bg-surface-2',
                )}
              >
                <Avatar user={c.to} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={cn('truncate text-[14px] capitalize', unread ? 'font-bold' : 'font-semibold')}>
                      {fullName(c.to)}
                    </span>
                    <span className={cn('ml-auto shrink-0 text-[11px]', unread ? 'font-semibold text-brand-600' : 'text-fg-faint')}>
                      {shortWhen(c.lastReceivedAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={cn('truncate text-[12.5px]', unread ? 'text-fg' : 'text-fg-muted')}>{c.lastMessage}</span>
                    {unread && (
                      <span className="ml-auto grid min-w-[18px] shrink-0 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-[18px] text-white">
                        {c.countUnread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ---------- Conversacion ---------- */

export function Thread({
  me,
  other,
  onBack,
  onSent,
  compact = false,
}: {
  me: string;
  other: ChatUser;
  onBack: () => void;
  onSent: (text: string) => void;
  /** Ventana flotante: boton de volver siempre visible y sin ayuda de teclado. */
  compact?: boolean;
}) {
  const api = useApi();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);

  const load = useCallback(async () => {
    const first = await api.chatMessages(other.userId, 1);
    setMessages(first.slice().reverse());
    setHasMore(first.length > 0);
    setPage(1);
  }, [api, other.userId]);

  useEffect(() => {
    let alive = true;
    setMessages(null);
    setError('');
    stickBottom.current = true;
    load()
      .then(() => {
        if (alive) api.markChatRead(other.userId).catch(() => {});
      })
      .catch((e) => alive && setError(e?.message ?? 'No se pudo cargar la conversación'));
    return () => {
      alive = false;
    };
  }, [load, api, other.userId]);

  useEffect(() => {
    if (stickBottom.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const loadOlder = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const older = await api.chatMessages(other.userId, page + 1);
      if (older.length === 0) setHasMore(false);
      else {
        stickBottom.current = false;
        setPage((p) => p + 1);
        setMessages((m) => {
          const known = new Set((m ?? []).map((x) => x.id));
          return [...older.slice().reverse().filter((x) => !known.has(x.id)), ...(m ?? [])];
        });
        // Mantiene la posicion de lectura al anteponer mensajes viejos.
        requestAnimationFrame(() => el && (el.scrollTop = el.scrollHeight - prevHeight));
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      await api.sendMessage(other.userId, body);
      setText('');
      stickBottom.current = true;
      await load();
      onSent(body);
    } catch {
      setSendError('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  // Agrupa por dia para los separadores.
  const groups = useMemo(() => {
    const out: { label: string; items: ChatMessage[] }[] = [];
    for (const m of messages ?? []) {
      const d = toDate(m.createdAt);
      const label = d ? dayLabel(d) : '';
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(m);
      else out.push({ label, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2.5">
        <button
          onClick={onBack}
          aria-label="Volver a conversaciones"
          className={cn(
            'grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg cursor-pointer',
            !compact && 'md:hidden',
          )}
        >
          <ChevronLeft size={18} />
        </button>
        <Avatar user={other} className="size-9" />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold capitalize">{fullName(other)}</div>
          {other.commonSectionsNumber != null && (
            <div className="text-[12px] text-fg-muted">
              {other.commonSectionsNumber} {other.commonSectionsNumber === 1 ? 'sección en común' : 'secciones en común'}
            </div>
          )}
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-surface-2/40 px-3 py-4 sm:px-5">
        {error ? (
          <ErrorState error={error} />
        ) : !messages ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-[13px] text-fg-faint">
            <MessagesSquare size={24} />
            <p>
              Escribe el primer mensaje a <span className="font-semibold capitalize text-fg-muted">{fullName(other)}</span>.
            </p>
          </div>
        ) : (
          <>
            {hasMore && messages.length >= 10 && (
              <div className="mb-3 flex justify-center">
                <Button size="sm" variant="secondary" onClick={loadOlder} disabled={loadingMore}>
                  {loadingMore ? 'Cargando…' : 'Cargar anteriores'}
                </Button>
              </div>
            )}
            {groups.map((g) => (
              <div key={g.label + g.items[0].id}>
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-fg-muted card-shadow">
                    {g.label}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {g.items.map((m) => {
                    const mine = m.userIdFrom === me;
                    const time = toDate(m.createdAt)?.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
                    return (
                      <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed',
                            mine
                              ? 'rounded-br-md bg-brand-600 text-white'
                              : 'rounded-bl-md border border-[var(--border)] bg-surface text-fg',
                          )}
                        >
                          {m.message && <Linkified text={m.message} mine={mine} />}
                          {m.fileUrl && (
                            <Attachment
                              m={m}
                              mine={mine}
                              onOpen={() => setPreview({ url: m.fileUrl, name: m.fileName || 'Archivo adjunto' })}
                            />
                          )}
                          <div className={cn('mt-0.5 text-right text-[10.5px]', mine ? 'text-white/70' : 'text-fg-faint')}>
                            {time}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-[var(--border-strong)] bg-surface p-1.5 pl-3.5 focus-within:ring-2 focus-within:ring-[var(--ring)]">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escribe un mensaje…"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[14px] [field-sizing:content] focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            aria-label="Enviar"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-[background-color,transform,opacity] duration-150 hover:bg-brand-700 active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {sending ? <Spinner className="size-4 border-2 border-white/40 border-t-white" /> : <ArrowUp size={17} />}
          </button>
        </div>
        {sendError && <p className="mt-1.5 text-[12px] font-medium text-brand-600">{sendError}</p>}
        {!compact && (
          <p className="mt-1.5 px-1 text-[11px] text-fg-faint">Enter para enviar · Shift + Enter para salto de línea</p>
        )}
      </div>

      <FilePreview file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/* ---------- Nuevo mensaje: docentes de tus cursos activos ---------- */

export function NewMessagePicker({ onPick, onClose }: { onPick: (u: ChatUser) => void; onClose: () => void }) {
  const api = useApi();
  const [courses, setCourses] = useState<DashboardCourse[] | null>(null);

  useEffect(() => {
    api.dashboardCourses().then(setCourses).catch(() => setCourses([]));
  }, [api]);

  const teachers = useMemo(() => {
    const active = (courses ?? []).filter((c) => c.active);
    const m = new Map<string, { user: ChatUser; courses: string[] }>();
    for (const c of active.length ? active : courses ?? []) {
      if (!c.teacherId) continue;
      const cur = m.get(c.teacherId) ?? {
        user: { userId: c.teacherId, firstName: c.teacherFirstName, lastName: c.teacherLastName, picture: c.profilePictureUrl },
        courses: [],
      };
      cur.courses.push(c.name);
      m.set(c.teacherId, cur);
    }
    return [...m.values()];
  }, [courses]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16, ease: EASE_OUT }}
      className="absolute inset-x-3 top-[60px] z-20 max-h-[60%] overflow-y-auto rounded-2xl border border-[var(--border)] bg-surface p-1.5 card-shadow-lg"
    >
      <div className="flex items-center justify-between px-2.5 py-2">
        <span className="text-[12px] font-bold uppercase tracking-wide text-fg-faint">Tus docentes</span>
        <button onClick={onClose} aria-label="Cerrar" className="grid size-7 place-items-center rounded-lg text-fg-faint hover:bg-surface-2 cursor-pointer">
          <X size={15} />
        </button>
      </div>
      {!courses ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : teachers.length === 0 ? (
        <p className="px-3 py-6 text-center text-[13px] text-fg-faint">No encontramos docentes en tus cursos.</p>
      ) : (
        teachers.map(({ user, courses: cs }) => (
          <button
            key={user.userId}
            onClick={() => onPick(user)}
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2 cursor-pointer"
          >
            <Avatar user={user} className="size-9" />
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold capitalize">{fullName(user)}</div>
              <div className="truncate text-[12px] text-fg-muted">{cs.join(' · ')}</div>
            </div>
          </button>
        ))
      )}
    </motion.div>
  );
}

/* ---------- Pagina ---------- */

export function Messages() {
  const api = useApi();
  const { session } = useAuth();
  const me = session?.userId ?? '';
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('toid');
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  // Destinatario elegido que aun no tiene conversacion (no aparece en la lista).
  const [draftUser, setDraftUser] = useState<ChatUser | null>(null);

  const loadChats = useCallback(
    () =>
      api
        .chats(1)
        .then(setChats)
        .catch((e) => setError(e?.message ?? 'No se pudieron cargar los mensajes')),
    [api],
  );

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const select = (userId: string | null) => {
    setPicking(false);
    setParams(userId ? { toid: userId } : {}, { replace: false });
    if (userId) setChats((cs) => cs?.map((c) => (c.to.userId === userId ? { ...c, countUnread: 0 } : c)) ?? cs);
  };

  // Si llega ?toid= de alguien sin conversacion, se buscan sus datos para poder escribirle.
  const other: ChatUser | null = useMemo(() => {
    if (!selectedId) return null;
    const fromList = chats?.find((c) => c.to.userId === selectedId)?.to;
    if (fromList) return fromList;
    return draftUser?.userId === selectedId ? draftUser : null;
  }, [selectedId, chats, draftUser]);

  useEffect(() => {
    if (!selectedId || !chats || other) return;
    api
      .user(selectedId)
      .then((u) => setDraftUser({ userId: u.userId ?? selectedId, firstName: u.firstName, lastName: u.lastName, picture: u.picture }))
      .catch(() => setDraftUser({ userId: selectedId, firstName: 'Usuario', lastName: '', picture: null }));
  }, [selectedId, chats, other, api]);

  if (error) return <ErrorState error={error} />;

  const unreadTotal = (chats ?? []).reduce((n, c) => n + (c.countUnread > 0 && c.to.userId !== selectedId ? 1 : 0), 0);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {chats
            ? `${chats.length} ${chats.length === 1 ? 'conversación' : 'conversaciones'}${unreadTotal ? ` · ${unreadTotal} sin leer` : ''}`
            : 'Cargando conversaciones…'}
        </p>
      </div>

      <div className="grid h-[calc(100dvh-210px)] min-h-[480px] overflow-hidden rounded-2xl border border-[var(--border)] bg-surface card-shadow md:grid-cols-[320px_minmax(0,1fr)]">
        <div className={cn('relative min-h-0 border-[var(--border)] md:border-r', selectedId ? 'hidden md:block' : 'block')}>
          <ChatList chats={chats} selected={selectedId} onSelect={select} onNew={() => setPicking((p) => !p)} />
          <AnimatePresence>
            {picking && (
              <NewMessagePicker
                onClose={() => setPicking(false)}
                onPick={(u) => {
                  setDraftUser(u);
                  select(u.userId);
                }}
              />
            )}
          </AnimatePresence>
        </div>

        <div className={cn('min-h-0', selectedId ? 'block' : 'hidden md:block')}>
          {other ? (
            <Thread key={other.userId} me={me} other={other} onBack={() => select(null)} onSent={() => loadChats()} />
          ) : selectedId ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-fg-faint">
                <MessagesSquare size={26} />
              </div>
              <div>
                <p className="font-semibold">Elige una conversación</p>
                <p className="mt-1 text-sm text-fg-muted">o empieza una nueva con alguno de tus docentes.</p>
              </div>
              <Button size="sm" onClick={() => setPicking(true)}>
                <MessageSquarePlus size={15} /> Nuevo mensaje
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
