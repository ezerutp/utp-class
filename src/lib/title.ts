const LOWER_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'al', 'con', 'para', 'por']);
/**
 * "GESTIÓN DE DATA CENTER (42000) (Semana 8) - Miércoles" -> "Gestión de Data Center (42000)".
 * Solo toca palabras en MAYUSCULAS (respeta numeros romanos) y quita la semana/dia, que ya se ven en el calendario.
 */
export const niceTitle = (s: string) =>
  s
    .replace(/\s*\(semana\s*\d+\)/gi, '')
    .replace(/\s*-\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s*$/i, '')
    .replace(/\p{L}+/gu, (w, offset: number) => {
      if (w !== w.toUpperCase() || /^[IVX]+$/.test(w) || (w.length === 1 && w !== 'Y' && w !== 'E')) return w;
      const low = w.toLowerCase();
      return offset > 0 && LOWER_WORDS.has(low) ? low : low.charAt(0).toUpperCase() + low.slice(1);
    })
    .trim();
