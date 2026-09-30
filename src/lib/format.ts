export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

/** "2026-04-25 18:30:00" | ISO -> "25/04/2026 · 6:30 pm" */
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/** 3_600_000 -> "1 h", 172_800_000 -> "2 días" */
export function fmtDuration(ms: number): string {
  const m = Math.max(1, Math.round(Math.abs(ms) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? '1 día' : `${d} días`;
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtSize(bytes?: number): string {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export const CONTENT_ICON: Record<string, string> = {
  FILE: '📄',
  URL: '🔗',
  FORUM: '💬',
  HOMEWORK: '📝',
  EVALUATION: '🧪',
};

export const CONTENT_LABEL: Record<string, string> = {
  FILE: 'Material',
  URL: 'Enlace',
  FORUM: 'Foro',
  HOMEWORK: 'Tarea',
  EVALUATION: 'Evaluación',
};
