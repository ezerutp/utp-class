import { motion } from 'framer-motion';
import { useTheme } from '../lib/theme';
import { EASE_OUT } from '../lib/motion';

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="relative grid size-9 place-items-center rounded-xl border border-[var(--border-strong)] bg-surface text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors active:scale-95 cursor-pointer"
    >
      <motion.span
        key={dark ? 'moon' : 'sun'}
        initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: EASE_OUT }}
        className="text-[17px] leading-none"
      >
        {dark ? '🌙' : '☀️'}
      </motion.span>
    </button>
  );
}
