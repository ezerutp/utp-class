import { useApi } from '../../lib/useApi';
import { useAsync } from '../../lib/useAsync';
import type { GradeRow } from '../../types/api';
import { CONTENT_LABEL, fmtDate } from '../../lib/format';
import { Card, Chip } from '../ui';
import { Loading, ErrorState, Empty } from '../StateBlock';

export function GradesTab({ sectionId }: { sectionId: string }) {
  const api = useApi();
  const { data, loading, error } = useAsync<GradeRow[]>(() => api.grades(sectionId), [sectionId]);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const rows = (data ?? []).filter((r) => r.isQualificated).sort((a, b) => a.weekNumber - b.weekNumber);
  if (rows.length === 0) return <Empty label="Aún no hay notas registradas." />;

  const graded = rows.filter((r) => r.gradeStatus === 'GRADED' && r.grade != null);
  const avg = graded.length
    ? (graded.reduce((s, r) => s + (r.grade ?? 0), 0) / graded.length).toFixed(1)
    : '–';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-[150px] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">
            Promedio simple
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{avg}</div>
        </Card>
        <Card className="flex-1 min-w-[150px] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">
            Calificadas
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">
            {graded.length}
            <span className="text-lg text-fg-faint">/{rows.length}</span>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-surface-2 text-left text-[11px] uppercase tracking-wide text-fg-faint">
              <th className="px-4 py-3 font-semibold">Sem.</th>
              <th className="px-4 py-3 font-semibold">Actividad</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Tipo</th>
              <th className="px-4 py-3 text-center font-semibold">Nota</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.contentId} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 text-fg-faint tabular-nums">{r.weekNumber || '–'}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{r.activityTitle}</div>
                  {r.gradeDate && (
                    <div className="text-[12px] text-fg-faint">{fmtDate(r.gradeDate)}</div>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-fg-muted sm:table-cell">
                  {CONTENT_LABEL[r.type] ?? r.type}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.gradeStatus === 'GRADED' && r.grade != null ? (
                    <>
                      <span
                        className={`text-[16px] font-bold tabular-nums ${
                          r.grade >= 13 ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600'
                        }`}
                      >
                        {r.grade}
                      </span>
                      <span className="text-[12px] text-fg-faint"> /{r.evaluationTopScore || 20}</span>
                    </>
                  ) : (
                    <span className="text-fg-faint">–</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.gradeStatus === 'GRADED' ? (
                    <Chip tone="green">Calificado</Chip>
                  ) : (
                    <Chip tone="amber">Pendiente</Chip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
