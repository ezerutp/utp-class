import { ButtonHTMLAttributes, HTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost';
type BtnSize = 'sm' | 'md';

const btnBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl select-none ' +
  'transition-[transform,background-color,border-color,color] duration-150 ' +
  'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer';

const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary:
    'bg-surface text-fg border border-[var(--border-strong)] hover:bg-surface-2',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-2',
};

const btnSizes: Record<BtnSize, string> = {
  sm: 'text-[13px] px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }
>(function Button({ className, variant = 'primary', size = 'md', ...props }, ref) {
  return (
    <button ref={ref} className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...props} />
  );
});

/* ---------- Card ---------- */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-surface card-shadow',
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Chip ---------- */
type ChipTone = 'neutral' | 'brand' | 'green' | 'amber';
const chipTones: Record<ChipTone, string> = {
  neutral: 'bg-surface-2 text-fg-muted border-[var(--border)]',
  brand: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-600/15 dark:text-brand-300 dark:border-brand-600/30',
  green:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
  amber:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
};
export function Chip({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        chipTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Progress ---------- */
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 rounded-full bg-[var(--border)] overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'size-8 rounded-full border-[3px] border-[var(--border)] border-t-brand-600 animate-spin',
        className,
      )}
    />
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-[var(--border)]', className)} />;
}
