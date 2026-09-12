import { z } from 'zod';

/**
 * Schemas del catálogo A2UI-lite (API JSON para el cliente client/).
 *
 * Cada schema es el "data schema" de un item del catálogo — define qué
 * puede/debe elegir el modelo (nunca datos crudos, esos vienen del MCP).
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

export const schemaSaldo = z.object({
  titulo: z
    .string()
    .describe('Qué representa el monto, ej. "Saldo disponible", "Total del mes".'),
  mensajeAgente: z.string().describe('Contexto breve, una línea.'),
});

export const schemaTransacciones = z.object({
  titulo: z
    .string()
    .describe('Encabezado de la lista, ej. "Últimos movimientos".'),
  limite: z
    .number()
    .int()
    .positive()
    .max(20)
    .optional()
    .describe('Cuántos movimientos mostrar. Si no se especifica, se usan 10.'),
  mensajeAgente: z.string().describe('Observación breve, una línea.'),
});

export const schemaComparativoGastos = z.object({
  titulo: z
    .string()
    .describe('Encabezado, ej. "Tus gastos de septiembre".'),
  mensajeAgente: z
    .string()
    .describe('Insight breve sobre el patrón de gasto, una línea.'),
});
