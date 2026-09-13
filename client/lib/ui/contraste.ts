import { colores } from './theme';

/**
 * Utilidades de color en tiempo de ejecución: contraste WCAG 2.1 y alfa.
 *
 * Existe por los colores de intención (`COLOR_INTENCION` en `theme.ts`):
 * son una paleta semántica que puede crecer, y fijar "texto blanco" para
 * todos rompe en cuanto entra un color claro. El verde de ahorro (#10B981)
 * es justo ese caso: con blanco da 2.54:1 — reprueba AA, que pide 4.5:1 —
 * y con texto oscuro da 7.07:1.
 *
 * Calcularlo en vez de mantener una tabla a mano significa que agregar una
 * intención nueva (un amarillo de "recompensa", por ejemplo) no puede
 * introducir un botón ilegible por olvido.
 */

/** Linealiza un canal sRGB (0-255) según la fórmula de WCAG. */
function canalLineal(valor: number) {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un hex de 6 dígitos (`#RRGGBB`). */
export function luminancia(hex: string) {
  const limpio = hex.replace('#', '');
  const r = canalLineal(parseInt(limpio.slice(0, 2), 16));
  const g = canalLineal(parseInt(limpio.slice(2, 4), 16));
  const b = canalLineal(parseInt(limpio.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste entre dos colores: de 1:1 (iguales) a 21:1. */
export function contraste(unColor: string, otroColor: string) {
  const a = luminancia(unColor);
  const b = luminancia(otroColor);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * El color de texto más legible sobre `fondo`: blanco u oscuro, el que más
 * contraste dé. Úsalo siempre que el fondo no se conozca al escribir el
 * estilo (botones de intención, chips de categoría, etc.).
 */
export function textoSobre(fondo: string) {
  return contraste(fondo, colores.textoInverso) >= contraste(fondo, colores.texto)
    ? colores.textoInverso
    : colores.texto;
}

/**
 * El mismo color con transparencia: `conAlfa('#1D4ED8', 0.08)`.
 *
 * Devuelve `rgba()` y no hex de 8 dígitos porque el hex con alfa no se
 * soporta parejo en todas las plataformas de RN, y `rgba()` sí.
 *
 * Se usa para los fondos tenues de los estados seleccionados: tiñe sin
 * competir con el texto que va encima (a 0.08 sobre blanco, el contraste
 * del texto oscuro apenas se mueve).
 */
export function conAlfa(hex: string, alfa: number) {
  const limpio = hex.replace('#', '');
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}
