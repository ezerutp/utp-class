import { Bell } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAsync } from '../lib/useAsync';

export function NotificationsBell() {
  const api = useApi();
  const { data } = useAsync<{ count: number }>(
    () => api.notificationsCount().catch(() => ({ count: 0 })),
    [],
  );
  const count = data?.count ?? 0;

  return (
    <button
      aria-label="Notificaciones"
      className="relative grid size-9 place-items-center rounded-xl border border-[var(--border-strong)] bg-surface text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg active:scale-95 cursor-pointer"
    >
      <Bell size={18} strokeWidth={2} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-[18px] text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
