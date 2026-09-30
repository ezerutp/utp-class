import {
  Code2,
  Lightbulb,
  BarChart3,
  Users,
  FileText,
  Briefcase,
  Database,
  Network,
  Calculator,
  FlaskConical,
  Globe,
  Scale,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

const RULES: [RegExp, LucideIcon][] = [
  [/software|program|calidad de soft|algorit|c[oó]digo/i, Code2],
  [/innovaci|transformaci|creativ|emprend/i, Lightbulb],
  [/inteligencia de negocio|business|anal[ií]tic|estad[ií]stic|datos/i, BarChart3],
  [/base de datos|database|data\b/i, Database],
  [/interacci[oó]n|hombre m[aá]quina|hci|ux|dise[nñ]o/i, Users],
  [/planeamiento|estrat[eé]gic|gesti[oó]n|proyecto/i, FileText],
  [/laboral|trabajo|empleab|ruta laboral|carrera/i, Briefcase],
  [/sistemas de informaci|redes|network|infraestructura/i, Network],
  [/matem|c[aá]lculo|[aá]lgebra|estad/i, Calculator],
  [/qu[ií]mic|f[ií]sic|biolog|laborator/i, FlaskConical],
  [/ingl[eé]s|idioma|comunicaci[oó]n|lengua/i, Globe],
  [/[eé]tic|derecho|legal|constituci/i, Scale],
];

export function courseIcon(name: string): LucideIcon {
  for (const [re, icon] of RULES) if (re.test(name)) return icon;
  return BookOpen;
}
