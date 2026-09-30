import { useMemo } from 'react';
import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noreferrer noopener');
  }
});

/** Renderiza HTML del backend (anuncios/descripciones) sanitizado y sin estilos inline. */
export function RichHtml({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html || '', {
        FORBID_ATTR: ['style', 'class', 'width', 'height'],
        FORBID_TAGS: ['style', 'font'],
      }),
    [html],
  );
  return (
    <div
      className={className ?? 'md text-[14px] leading-relaxed text-fg'}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
