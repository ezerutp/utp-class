import { useCallback, useEffect, useState } from 'react';
import { CornerDownRight, ChevronLeft, ChevronRight, MessageSquare, Send } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import type { ForumCommentNode, ForumCommentsResponse } from '../../types/api';
import { RichHtml } from '../RichHtml';
import { Spinner, Button } from '../ui';

function initials(f?: string, l?: string) {
  return ((f?.[0] ?? '') + (l?.[0] ?? '')).toUpperCase() || '?';
}

function Composer({
  placeholder,
  sending,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  sending: boolean;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  return (
    <div className="flex flex-col gap-2">
      <textarea
        autoFocus={autoFocus}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-surface px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={sending || !text.trim()}
          onClick={() => {
            onSubmit(text.trim());
            setText('');
          }}
        >
          <Send size={14} /> {sending ? 'Enviando…' : 'Publicar'}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

function Comment({
  node,
  depth,
  onReply,
  replyingId,
  setReplyingId,
  sending,
  submitReply,
}: {
  node: ForumCommentNode;
  depth: number;
  onReply: (id: string) => void;
  replyingId: string | null;
  setReplyingId: (id: string | null) => void;
  sending: boolean;
  submitReply: (parentId: string, text: string) => void;
}) {
  const isTeacher = node.userRole?.toUpperCase() === 'TEACHER';
  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-brand-200 pl-4 dark:border-brand-600/30' : ''}>
      <div
        className={`rounded-xl border p-3.5 transition-colors ${
          isTeacher
            ? 'border-brand-200 bg-brand-50 dark:border-brand-600/30 dark:bg-brand-600/10'
            : 'border-[var(--border)] bg-surface'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
              isTeacher
                ? 'bg-brand-600 text-white'
                : 'bg-brand-600/10 text-brand-600 dark:text-brand-300'
            }`}
          >
            {initials(node.userFirstName, node.userLastName)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold capitalize">
                {`${node.userFirstName} ${node.userLastName}`.toLowerCase()}
              </span>
              {isTeacher && (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  Docente
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-fg-faint">{node.commentedAt}</div>
          </div>
        </div>
        <div className="mt-2 text-[13.5px] leading-relaxed">
          <RichHtml html={node.description} />
        </div>
        <button
          onClick={() => onReply(node.id)}
          className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -ml-1.5 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-brand-600/10 hover:text-brand-600 cursor-pointer"
        >
          <CornerDownRight size={13} /> Responder
        </button>
      </div>

      {replyingId === node.id && (
        <div className="ml-4 mt-2 border-l-2 border-brand-200 pl-4 dark:border-brand-600/30">
          <Composer
            autoFocus
            placeholder="Escribe una respuesta…"
            sending={sending}
            onSubmit={(text) => submitReply(node.id, text)}
            onCancel={() => setReplyingId(null)}
          />
        </div>
      )}

      {node.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <Comment
              key={child.id}
              node={child}
              depth={depth + 1}
              onReply={onReply}
              replyingId={replyingId}
              setReplyingId={setReplyingId}
              sending={sending}
              submitReply={submitReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ForumThread({
  courseId,
  sectionId,
  forumId,
}: {
  courseId: string;
  sectionId: string;
  forumId: string;
}) {
  const api = useApi();
  const [data, setData] = useState<ForumCommentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      api
        .forumComments(courseId, sectionId, forumId, p)
        .then(setData)
        .catch(() => setData({ totalComments: 0, totalPages: 1, page: 1, data: [] }))
        .finally(() => setLoading(false));
    },
    [api, courseId, sectionId, forumId],
  );

  useEffect(() => load(page), [load, page]);

  const post = async (description: string, parentId?: string) => {
    setSending(true);
    setErr('');
    try {
      await api.postForumComment(courseId, sectionId, forumId, `<p>${description}</p>`, parentId);
      setReplyingId(null);
      load(1);
      setPage(1);
    } catch {
      setErr('No se pudo publicar el comentario. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const total = data?.totalComments ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <section className="mt-5">
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold">
        <span className="grid size-6 place-items-center rounded-md bg-brand-600/10 text-brand-600 dark:text-brand-300">
          <MessageSquare size={14} />
        </span>
        Comentarios
        <span className="rounded-full border border-[var(--border)] bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
          {total}
        </span>
      </h3>

      <div className="mb-4 rounded-xl border border-[var(--border)] bg-surface-2 p-3">
        <Composer placeholder="Escribe un comentario…" sending={sending} onSubmit={(t) => post(t)} />
        {err && <p className="mt-1.5 text-[12px] font-medium text-brand-600">{err}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <p className="text-[13px] text-fg-muted">Aún no hay participaciones. ¡Sé el primero!</p>
      ) : (
        <div className="space-y-2.5">
          {data!.data.map((node) => (
            <Comment
              key={node.id}
              node={node}
              depth={0}
              onReply={(id) => setReplyingId((r) => (r === id ? null : id))}
              replyingId={replyingId}
              setReplyingId={setReplyingId}
              sending={sending}
              submitReply={(pid, text) => post(text, pid)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-[13px]">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="grid size-8 place-items-center rounded-lg border border-[var(--border-strong)] disabled:opacity-40 hover:bg-surface-2 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="grid size-8 place-items-center rounded-lg border border-[var(--border-strong)] disabled:opacity-40 hover:bg-surface-2 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
