import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUp,
  Bot,
  CalendarDays,
  FileText,
  FlaskConical,
  ListChecks,
  MessagesSquare,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAssistant } from '../lib/unibot';
import { useApi } from '../lib/useApi';
import { answerLocally, type Answer, type AssistantTab } from '../lib/assistantTools';
import { GradesCard } from './GradesCard';
import { Markdown } from './Markdown';
import { spring, EASE_OUT } from '../lib/motion';

interface Msg {
  id: number;
  role: 'user' | 'bot';
  text: string;
  answer?: Answer;
}

const SUGGESTIONS: { icon: LucideIcon; label: string; query: string }[] = [
  { icon: ListChecks, label: 'Tareas pendientes', query: '¿Qué tareas tengo pendientes?' },
  { icon: CalendarDays, label: 'Resumen de la semana', query: '¿Qué tengo esta semana?' },
  { icon: MessagesSquare, label: 'Foros de esta semana', query: 'Foros de esta semana' },
  { icon: FlaskConical, label: 'Evaluaciones', query: 'Evaluaciones de esta semana' },
  { icon: FileText, label: 'Materiales', query: 'Materiales de esta semana' },
  { icon: Trophy, label: 'Mis notas', query: 'Mis notas' },
];

const welcome = (courseName: string): Msg => ({
  id: 0,
  role: 'bot',
  text: `¡Hola! Soy tu asistente de **${courseName}**. Puedo consultar tus **tareas**, **foros**, **materiales**, **evaluaciones** y **notas** de este curso, o responder dudas generales.`,
});

function BotAvatar({ className = 'size-7' }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-brand-600/10 text-brand-600 dark:text-brand-300 ${className}`}
    >
      <Bot size={15} />
    </span>
  );
}

export function Assistant({
  courseId,
  sectionId,
  courseName,
  onOpenTab,
}: {
  courseId: string;
  sectionId: string;
  courseName: string;
  onOpenTab?: (tab: AssistantTab) => void;
}) {
  const { send } = useAssistant();
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([welcome(courseName)]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open && !busy) inputRef.current?.focus();
  }, [open, busy]);

  const submit = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: Date.now(), role: 'user', text }]);
    setBusy(true);
    try {
      const local = await answerLocally(text, { api, courseId, sectionId });
      if (local) {
        setMessages((m) => [...m, { id: Date.now() + 1, role: 'bot', text: local.text, answer: local }]);
        return;
      }
      const reply = await send({
        message: text,
        sectionId,
        course: { courseId, name: courseName },
        sessionId,
      });
      if (reply.sessionId) setSessionId(reply.sessionId);
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'bot', text: reply.message }]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: 'bot', text: 'Hubo un error de conexión. Intenta de nuevo.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([welcome(courseName)]);
    setSessionId('');
    setInput('');
  };

  const fresh = messages.length === 1;

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar asistente virtual' : 'Abrir asistente virtual'}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_28px_-6px_rgba(226,0,26,0.6)] transition-shadow hover:shadow-[0_12px_32px_-6px_rgba(226,0,26,0.75)] cursor-pointer"
      >
        <motion.span
          key={open ? 'x' : 'bot'}
          initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          {open ? <X size={24} /> : <Sparkles size={24} />}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={spring}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 right-6 z-50 flex h-[600px] max-h-[calc(100vh-8rem)] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-surface card-shadow-lg"
          >
            {/* header */}
            <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-4 text-white">
              <span className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10" />
              <span className="pointer-events-none absolute -bottom-12 right-10 size-24 rounded-full bg-white/5" />
              <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/25">
                <Sparkles size={19} />
              </span>
              <div className="relative min-w-0 flex-1">
                <div className="text-[15px] font-bold leading-tight">Asistente virtual</div>
                <div className="truncate text-[12px] text-white/80">{courseName}</div>
              </div>
              {!fresh && (
                <button
                  onClick={reset}
                  title="Nueva conversación"
                  aria-label="Nueva conversación"
                  className="relative grid size-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="relative grid size-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* messages */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-bg-subtle p-4">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}
                >
                  {m.role === 'bot' && <BotAvatar />}
                  <div
                    className={`max-w-[88%] min-w-0 px-3.5 py-2.5 text-[14px] leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm'
                        : 'rounded-2xl rounded-bl-md border border-[var(--border)] bg-surface'
                    }`}
                  >
                    {m.role === 'bot' ? <Markdown text={m.text} /> : m.text}
                    {m.answer?.grades && <GradesCard {...m.answer.grades} />}
                    {m.answer?.action && onOpenTab && (
                      <button
                        onClick={() => {
                          onOpenTab(m.answer!.action!.tab);
                          setOpen(false);
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-[13px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.98] cursor-pointer"
                      >
                        {m.answer.action.label} <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {fresh && !busy && (
                <div className="pl-9">
                  <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-fg-faint">
                    Prueba preguntando
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map(({ icon: Ico, label, query }) => (
                      <button
                        key={label}
                        onClick={() => submit(query)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12.5px] font-semibold text-brand-700 transition-[background-color,transform] duration-150 hover:bg-brand-100 active:scale-95 dark:border-brand-600/30 dark:bg-brand-600/10 dark:text-brand-300 dark:hover:bg-brand-600/20 cursor-pointer"
                      >
                        <Ico size={13} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {busy && (
                <div className="flex items-end gap-2">
                  <BotAvatar />
                  <div className="flex gap-1 rounded-2xl rounded-bl-md border border-[var(--border)] bg-surface px-4 py-3.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-brand-500"
                        animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="border-t border-[var(--border)] bg-surface p-3"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-surface-2 py-1.5 pl-4 pr-1.5 transition-shadow focus-within:ring-2 focus-within:ring-[var(--ring)]">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escribe tu pregunta…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={busy}
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none placeholder:text-fg-faint"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Enviar"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-[transform,background-color,opacity] duration-150 hover:bg-brand-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
