import type { AcademicPeriod, DashboardCourse } from '../types/api';
import { toDate } from './format';

const STORAGE_KEY = 'dashboard.period';

export function loadStoredPeriod(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storePeriod(period: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, period);
  } catch {
    /* sessionStorage no disponible */
  }
}

/**
 * Periodo vigente. La API puede marcar varios como LATEST_PERIOD (uno por carrera/modalidad)
 * y su orden no es estable, asi que se desempata de forma determinista:
 * fecha de inicio mas reciente, luego el que tenga mas cursos, luego el codigo.
 */
export function pickCurrentPeriod(courses: DashboardCourse[], periods: AcademicPeriod[]): string {
  const courseCount = new Map<string, number>();
  for (const c of courses) courseCount.set(c.period, (courseCount.get(c.period) ?? 0) + 1);

  const startMs = (p: AcademicPeriod) => toDate(p.start || p.parsedStartDate)?.getTime() ?? 0;
  const newest = (a: AcademicPeriod, b: AcademicPeriod) =>
    startMs(b) - startMs(a) ||
    (courseCount.get(b.period) ?? 0) - (courseCount.get(a.period) ?? 0) ||
    a.period.localeCompare(b.period);

  const now = Date.now();
  const inRange = (p: AcademicPeriod) => {
    const s = toDate(p.start)?.getTime();
    const e = toDate(p.end)?.getTime();
    return s != null && e != null && s <= now && now <= e;
  };

  const usable = periods.filter((p) => p.type !== 'CURRENT_PERIOD' && p.period !== '9999');
  const tiers = [
    usable.filter((p) => p.type === 'LATEST_PERIOD'),
    usable.filter((p) => p.active && inRange(p)),
    usable.filter((p) => p.active),
  ];
  for (const tier of tiers) {
    const hit = tier.filter((p) => courseCount.has(p.period)).sort(newest)[0];
    if (hit) return hit.period;
  }

  // Sin datos de periodos: el periodo con cursos activos y mas cursos, o el mas reciente por inicio.
  const start = new Map(periods.map((p) => [p.period, startMs(p)] as const));
  const codes = [...courseCount.keys()].sort(
    (a, b) =>
      (start.get(b) ?? 0) - (start.get(a) ?? 0) ||
      (courseCount.get(b) ?? 0) - (courseCount.get(a) ?? 0) ||
      a.localeCompare(b),
  );
  const active = codes.find((code) => courses.some((c) => c.period === code && c.active));
  return active ?? codes[0] ?? 'all';
}
