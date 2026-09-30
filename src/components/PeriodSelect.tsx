import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { EASE_OUT } from '../lib/motion';

interface Props {
  value: string;
  options: (readonly [string, string])[]; // [code, label]
  onChange: (v: string) => void;
}

export function PeriodSelect({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const all = [...options, ['all', 'Todos los periodos'] as const];
  const current = all.find(([c]) => c === value)?.[1] ?? 'Selecciona';

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-surface px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2 sm:w-[300px] cursor-pointer"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600/12 text-brand-600">
          <Calendar size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-fg-faint">
            Ciclo académico
          </span>
          <span className="block truncate text-[13.5px] font-semibold">{current}</span>
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-20 mt-2 max-h-[320px] w-full min-w-[280px] overflow-auto rounded-2xl border border-[var(--border)] bg-surface p-1.5 card-shadow-lg"
          >
            {all.map(([code, label]) => (
              <li key={code}>
                <button
                  onClick={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] font-medium transition-colors hover:bg-surface-2 cursor-pointer ${
                    code === value ? 'text-brand-600' : 'text-fg'
                  }`}
                >
                  {label}
                  {code === value && <Check size={16} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
