import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { EASE_OUT } from '../lib/motion';

const SIZES = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' } as const;

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className={`relative flex max-h-[88vh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-surface card-shadow-lg`}
          >
            <div className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="min-w-0 flex-1">
                {title && <h2 className="text-[17px] font-bold leading-snug">{title}</h2>}
                {subtitle && <div className="mt-0.5 text-[12.5px] text-fg-faint">{subtitle}</div>}
              </div>
              <button
                onClick={onClose}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
