import type { Variants, Transition } from 'framer-motion';

// Curvas y tiempos alineados con la filosofía de Emil (ease-out fuerte, <300ms).
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

export const spring: Transition = { type: 'spring', duration: 0.5, bounce: 0.2 };

/** Contenedor con stagger para listas/grids. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

/** Item que entra desde abajo (nunca desde scale(0)). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
};
