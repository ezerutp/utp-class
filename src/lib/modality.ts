// Mapeo de modalidad tal como lo usa el campus real (extraído del bundle).
// R = clases "Virtual en vivo" vía Zoom; VT/V/VR = Virtual 24/7 (grabado);
// SP = Semi-Presencial; P = Presencial.
export function modalityLabel(code: string): string {
  switch (code) {
    case 'R':
      return 'Virtual en vivo';
    case 'VT':
    case 'V':
    case 'VR':
      return 'Virtual 24/7';
    case 'SP':
      return 'Semi-Presencial';
    case 'P':
      return 'Presencial';
    default:
      return code;
  }
}

/** El curso tiene clases en vivo por Zoom (modalidad "R"). */
export function hasLiveZoom(code: string): boolean {
  return code === 'R';
}
