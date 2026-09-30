import { useApi } from '../../lib/useApi';
import { useAsync } from '../../lib/useAsync';
import type { Syllabus } from '../../types/api';
import { Button } from '../ui';
import { Loading, ErrorState, Empty } from '../StateBlock';

export function SyllabusTab({ courseId, sectionId }: { courseId: string; sectionId: string }) {
  const api = useApi();
  const { data, loading, error } = useAsync<Syllabus>(
    () => api.syllabus(courseId, sectionId),
    [courseId, sectionId],
  );

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data?.syllabusUrl) return <Empty label="Este curso no tiene sílabo publicado." />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold">Sílabo del curso · {data.period}</span>
        <a href={data.syllabusUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="secondary">
            Abrir ↗
          </Button>
        </a>
      </div>
      <iframe
        title="Sílabo"
        src={data.syllabusUrl}
        className="h-[78vh] w-full rounded-2xl border border-[var(--border)] bg-surface"
      />
    </div>
  );
}
