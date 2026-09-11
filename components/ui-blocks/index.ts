/**
 * Catálogo de bloques de LEGO disponibles para la IA.
 * Cada nuevo bloque (gráfica, tarjeta de transacción, alerta, etc.) se exporta
 * aquí para que `app/api/chat/route.ts` y el resto del equipo tengan un único
 * punto de entrada al catálogo.
 */
export { RastreadorMetas } from './RastreadorMetas';
export type { RastreadorMetasProps } from './RastreadorMetas';
