import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  FolderClosed,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MAIN: NavItem[] = [
  { to: '/', label: 'Mis cursos', icon: Home },
  { to: '/calendario', label: 'Calendario', icon: Calendar },
  { to: '/actividades', label: 'Actividades', icon: ClipboardList },
  { to: '/calificaciones', label: 'Calificaciones', icon: GraduationCap },
  { to: '/mensajes', label: 'Mensajes', icon: MessageSquare },
  { to: '/recursos', label: 'Recursos', icon: FolderClosed },
];

function Item({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors',
          isActive
            ? 'bg-brand-600/12 text-brand-600 dark:text-brand-300'
            : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={19}
            strokeWidth={2}
            className={cn('shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : '')}
          />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1">
        {MAIN.map((it) => (
          <Item key={it.to} item={it} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="my-4 border-t border-[var(--border)]" />
      <Item item={{ to: '/configuracion', label: 'Configuración', icon: Settings }} onNavigate={onNavigate} />
      <div className="flex-1" />
    </div>
  );
}
