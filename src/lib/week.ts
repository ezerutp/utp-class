import type { SectionDetail } from '../types/api';
import { toDate } from './format';

const WEEK_MS = 7 * 24 * 3600 * 1000;

export interface ActiveWeek {
  /** Semana activa, siempre dentro de 1..total. */
  week: number;
  total: number;
  /** El ciclo ya termino (la semana calculada supera el total). */
  ended: boolean;
  /** El ciclo aun no empieza. */
  notStarted: boolean;
  /** Rango de fechas de la semana activa; null si el ciclo termino o no empezo. */
  range: { startWeek: string; endWeek: string } | null;
}

/**
 * La API puede devolver un `currentWeek` fuera del rango del curso (p. ej. 28 en un curso de
 * 18 semanas, contado desde el inicio del ciclo). Se valida contra `numWeeks` y, si no
 * cuadra, se recalcula desde la fecha de inicio de la seccion.
 */
export function activeWeek(
  s: Pick<SectionDetail, 'numWeeks' | 'currentWeek' | 'currentWeekDetail' | 'start'>,
): ActiveWeek {
  const total = s.numWeeks > 0 ? s.numWeeks : 18;
  const start = toDate(s.start);

  const apiWeek = Number(s.currentWeek);
  const apiValid = Number.isFinite(apiWeek) && apiWeek >= 1 && apiWeek <= total;

  let raw = apiValid ? apiWeek : 1;
  if (!apiValid && start) raw = Math.floor((Date.now() - start.getTime()) / WEEK_MS) + 1;
  else if (!apiValid && Number.isFinite(apiWeek) && apiWeek > total) raw = apiWeek;

  const ended = raw > total;
  const notStarted = raw < 1;
  const week = Math.min(Math.max(raw, 1), total);

  let range: ActiveWeek['range'] = null;
  if (!ended && !notStarted) {
    if (apiValid && s.currentWeekDetail?.startWeek) {
      range = s.currentWeekDetail;
    } else if (start) {
      const from = new Date(start.getTime() + (week - 1) * WEEK_MS);
      const to = new Date(from.getTime() + WEEK_MS - 1000);
      range = { startWeek: from.toISOString(), endWeek: to.toISOString() };
    }
  }
  return { week, total, ended, notStarted, range };
}
