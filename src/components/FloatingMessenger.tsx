import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, MessageCircle, X } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/cn';
import { EASE_OUT, spring } from '../lib/motion';
import type { Chat, ChatUser } from '../types/api';
import { ChatList, NewMessagePicker, Thread } from '../pages/Messages';
import { announceFloatOpen, onOtherFloatOpen } from '../lib/floating';

const REFRESH_MS = 60_000;

/** Boton flotante tipo Messenger: lista de chats y conversacion en una ventana compacta. */
export function FloatingMessenger() {
  const api = useApi();
  const { session } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [other, setOther] = useState<ChatUser | null>(null);
  const [picking, setPicking] = useState(false);
  const [badge, setBadge] = useState(0);
  const lastFetch = useRef(0);

  const onCourse = pathname.startsWith('/courses/');
  const hidden = pathname.startsWith('/mensajes');

  // Conteo de no leidos: al montar y al volver a la pestaña (como mucho una vez por minuto,
  // para no sumar llamadas al API, que limita peticiones).
  const refreshBadge = useCallback(() => {
    if (Date.now() - lastFetch.current < REFRESH_MS) return;
    lastFetch.current = Date.now();
    api
      .unreadMessages()
      .then((r) => setBadge(typeof r === 'number' ? r : r?.count ?? 0))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    refreshBadge();
    const onFocus = () => document.visibilityState === 'visible' && refreshBadge();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [refreshBadge]);

  const loadChats = useCallback(
    () =>
      api
        .chats(1)
        .then((cs) => {
          setChats(cs);
          setBadge(cs.filter((c) => c.countUnread > 0).length);
        })
        .catch(() => setChats((c) => c ?? [])),
    [api],
  );

  useEffect(() => {
    if (open) loadChats();
  }, [open, loadChats]);

  useEffect(() => onOtherFloatOpen('messenger', () => setOpen(false)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (hidden || !session) return null;

  const toggle = () =>
    setOpen((o) => {
      if (!o) announceFloatOpen('messenger');
      return !o;
    });

  const select = (u: ChatUser) => {
    setPicking(false);
    setOther(u);
    setChats((cs) => {
      const next = cs?.map((c) => (c.to.userId === u.userId ? { ...c, countUnread: 0 } : c)) ?? cs;
      if (next) setBadge(next.filter((c) => c.countUnread > 0).length);
      return next;
    });
  };

  const fullPage = other ? `/mensajes?toid=${other.userId}` : '/mensajes';

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 right-6 z-50 flex h-[560px] max-h-[calc(100dvh-8rem)] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-surface card-shadow-lg"
          >
            {!other && (
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-[16px] font-bold">Mensajes</span>
                <div className="flex items-center gap-1">
                  <Link
                    to={fullPage}
                    onClick={() => setOpen(false)}
                    title="Abrir en pantalla completa"
                    aria-label="Abrir en pantalla completa"
                    className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Maximize2 size={16} />
                  </Link>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar mensajes"
                    className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg cursor-pointer"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>
            )}

            <div className="relative min-h-0 flex-1">
              {other ? (
                <Thread
                  key={other.userId}
                  compact
                  me={session.userId}
                  other={other}
                  onBack={() => {
                    setOther(null);
                    loadChats();
                  }}
                  onSent={() => {}}
                />
              ) : (
                <>
                  <ChatList
                    chats={chats}
                    selected={null}
                    onSelect={(id) => {
                      const u = chats?.find((c) => c.to.userId === id)?.to;
                      if (u) select(u);
                    }}
                    onNew={() => setPicking((p) => !p)}
                  />
                  <AnimatePresence>
                    {picking && <NewMessagePicker onClose={() => setPicking(false)} onPick={select} />}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.92 }}
        transition={spring}
        aria-label={open ? 'Cerrar mensajes' : 'Abrir mensajes'}
        className={cn(
          'fixed bottom-6 z-50 grid size-14 place-items-center rounded-full border border-[var(--border)] bg-surface text-brand-600 card-shadow-lg transition-[right,background-color] duration-200 hover:bg-surface-2 cursor-pointer dark:text-brand-300',
          onCourse ? 'right-24' : 'right-6',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'x' : 'msg'}
            initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            {open ? <X size={22} /> : <MessageCircle size={24} strokeWidth={2.2} />}
          </motion.span>
        </AnimatePresence>
        {!open && badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[20px] place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold leading-[20px] text-white ring-2 ring-[var(--bg,white)]">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </motion.button>
    </>
  );
}
