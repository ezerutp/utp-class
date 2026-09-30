import { useMemo, useState } from 'react';
import { useApi } from '../../lib/useApi';
import { useAsync } from '../../lib/useAsync';
import type { ZoomData, ZoomMeeting } from '../../types/api';
import { fmtDateTime } from '../../lib/format';
import { Card, Button } from '../ui';
import { Loading, ErrorState, Empty } from '../StateBlock';

export function ZoomTab({ courseId, sectionId }: { courseId: string; sectionId: string }) {
  const api = useApi();
  const { data, loading, error } = useAsync<ZoomData>(
    () => api.zoom(courseId, sectionId),
    [courseId, sectionId],
  );
  const [tab, setTab] = useState<'past' | 'upcoming'>('past');

  const { past, upcoming } = useMemo(() => {
    const now = Date.now();
    const list = (data?.listVideoConferenceResponse ?? []).slice();
    const at = (m: ZoomMeeting) => new Date(m.startAt?.replace(' ', 'T')).getTime() || 0;
    return {
      past: list.filter((m) => at(m) < now).sort((a, b) => at(b) - at(a)),
      upcoming: list.filter((m) => at(m) >= now).sort((a, b) => at(a) - at(b)),
    };
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const rows = tab === 'past' ? past : upcoming;

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer ${
              tab === t ? 'bg-surface text-fg card-shadow' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t === 'upcoming' ? `Próximas (${upcoming.length})` : `Pasadas (${past.length})`}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty label={tab === 'past' ? 'No hay clases pasadas.' : 'No hay próximas clases.'} />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-surface-2 text-left text-[11px] uppercase tracking-wide text-fg-faint">
                <th className="px-4 py-3 font-semibold">Título</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Fecha</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">ID</th>
                <th className="px-4 py-3 text-right font-semibold">Grabación</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{m.title}</div>
                    {m.weekNumber && (
                      <div className="text-[12px] text-fg-faint">
                        {/^\d+$/.test(String(m.weekNumber)) ? `Semana ${m.weekNumber}` : m.weekNumber}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-fg-muted md:table-cell">
                    {fmtDateTime(m.startAt)}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-[13px] text-fg-muted sm:table-cell">
                    {m.zoomId}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.playUrl ? (
                      <a href={m.playUrl} target="_blank" rel="noreferrer">
                        <Button size="sm">▶ Ver grabación</Button>
                      </a>
                    ) : m.zoomLink && tab === 'upcoming' ? (
                      <a href={m.zoomLink} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="secondary">
                          Unirse
                        </Button>
                      </a>
                    ) : (
                      <span className="text-[12px] text-fg-faint">
                        {m.processing ? 'Procesando…' : 'Sin grabación'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
