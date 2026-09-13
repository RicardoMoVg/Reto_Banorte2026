/**
 * Formato de moneda de la app.
 *
 * Los cuatro bloques de `components/` (raíz) todavía declaran su propia
 * copia de este `Intl.NumberFormat`. No se tocaron para no chocar con las
 * ramas que los están editando en paralelo (constitution.md 5); de aquí en
 * adelante, todo lo nuevo importa este.
 */
export const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/** "$4,500". Atajo para no repetir `.format()` en cada bloque. */
export function pesos(monto: number) {
  return formatoMXN.format(monto);
}
