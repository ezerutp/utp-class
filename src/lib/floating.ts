/** Evento para que el asistente y el messenger flotante no queden abiertos a la vez. */
export type FloatingWidget = 'assistant' | 'messenger';

export const FLOAT_OPEN_EVENT = 'utp:float-open';

export const announceFloatOpen = (who: FloatingWidget) =>
  window.dispatchEvent(new CustomEvent<FloatingWidget>(FLOAT_OPEN_EVENT, { detail: who }));

/** Llama a `close` cuando se abre otro widget flotante. Devuelve la funcion de limpieza. */
export function onOtherFloatOpen(me: FloatingWidget, close: () => void) {
  const handler = (e: Event) => (e as CustomEvent<FloatingWidget>).detail !== me && close();
  window.addEventListener(FLOAT_OPEN_EVENT, handler);
  return () => window.removeEventListener(FLOAT_OPEN_EVENT, handler);
}
