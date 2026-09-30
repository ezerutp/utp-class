import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsBell } from './NotificationsBell';
import { SidebarNav } from './Sidebar';
import { FloatingMessenger } from './FloatingMessenger';
import { EASE_OUT } from '../lib/motion';

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
}

function UserMenu({
  name,
  email,
  onLogout,
}: {
  name: string;
  email: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-surface-2 cursor-pointer"
      >
        <span className="grid size-9 place-items-center rounded-full bg-brand-600/12 text-[12px] font-bold text-brand-600">
          {initials(name)}
        </span>
        <span className="hidden max-w-[140px] truncate text-[13px] font-semibold capitalize sm:block">
          {name.trim().split(/\s+/)[0]?.toLowerCase()}
        </span>
        <ChevronDown
          size={15}
          className={`hidden text-fg-faint transition-transform sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-[var(--border)] bg-surface p-1.5 card-shadow-lg"
          >
            <div className="border-b border-[var(--border)] px-3 py-2.5">
              <div className="truncate text-[13.5px] font-semibold capitalize">{name.toLowerCase()}</div>
              <div className="truncate text-[12px] text-fg-faint">{email}</div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/configuracion');
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium hover:bg-surface-2 cursor-pointer"
            >
              <Settings size={16} className="text-fg-muted" /> Configuración
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium text-brand-600 hover:bg-brand-600/10 cursor-pointer"
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-[15px] font-black text-white">
        U
      </span>
      <span className="text-[15px]">
        UTP<span className="text-brand-600"> class</span>
      </span>
    </Link>
  );
}

export function Layout() {
  const { session, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="grid size-9 place-items-center rounded-xl text-fg-muted hover:bg-surface-2 md:hidden cursor-pointer"
            aria-label="Menú"
          >
            <Menu size={20} />
          </button>
          <Brand />
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationsBell />
          {session && (
            <UserMenu name={session.name} email={session.email} onLogout={logout} />
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-[var(--border)] px-3 py-5 md:block">
          <SidebarNav />
        </aside>

        {/* Drawer (mobile) */}
        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--border)] bg-surface px-3 py-4 md:hidden"
              >
                <div className="mb-4 flex items-center justify-between px-2">
                  <Brand />
                  <button
                    onClick={() => setDrawer(false)}
                    className="grid size-9 place-items-center rounded-xl text-fg-muted hover:bg-surface-2 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
                <SidebarNav onNavigate={() => setDrawer(false)} />
                <button
                  onClick={logout}
                  className="w-full rounded-xl px-3.5 py-2.5 text-left text-[14px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg cursor-pointer"
                >
                  Salir
                </button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <FloatingMessenger />
    </div>
  );
}
