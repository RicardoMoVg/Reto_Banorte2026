import { z } from 'zod';

/**
 * Schemas del catálogo A2UI-lite (API JSON para el cliente RN).
 *
 * Duplicados a propósito desde lib/ai/bloques.tsx en vez de importarlos de
 * ahí: esa ruta sigue siendo del chat web (RSC/streamUI) y no se toca
 * mientras el equipo decide si la retira. Cuando ambos caminos convivan
 * establemente, se puede unificar en un solo archivo fuente.
 */
export const schemaProgresoMeta = z.object({
  metaId: z
    .string()
    .optional()
    .describe(
      'Id de la meta a mostrar. Si no se especifica, se usa la meta con menor avance.',
    ),
  mensajeAgente: z
    .string()
    .describe('Mensaje breve (una línea) y motivador sobre este avance.'),
});
