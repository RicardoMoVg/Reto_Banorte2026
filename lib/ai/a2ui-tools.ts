import { tool } from 'ai';
import { getMetasUsuario } from '@/lib/mcp/mcp-client';
import { schemaProgresoMeta } from './a2ui-schemas';

/**
 * Catálogo de tools del A2UI-lite (API JSON, /app/api/agent/route.ts).
 *
 * Cada tool usa la API plana de "ai" y su `execute` regresa JSON, nunca
 * JSX — el cliente (mobile/) decide cómo pintarlo con su propio catálogo
 * de componentes nativos. Llama al MCP real: el modelo nunca inventa
 * datos, solo elige qué mostrar y redacta el mensaje de contexto.
 *
 * Paso 1 del plan de migración: un solo bloque (mostrarProgresoMeta) para
 * probar el contrato de punta a punta antes de agregar el resto.
 */
export function buildA2uiTools(userId: string) {
  return {
    mostrarProgresoMeta: tool({
      description:
        'Muestra visualmente el progreso de una meta de ahorro o hábito ' +
        'financiero del usuario. Úsala siempre que pregunte por su avance, ' +
        'en vez de describir el porcentaje en texto.',
      parameters: schemaProgresoMeta,
      execute: async ({ metaId, mensajeAgente }) => {
        const metas = await getMetasUsuario(userId);
        const meta = metaId ? metas.find((m) => m.id === metaId) : metas[0];

        if (!meta) {
          return { error: 'No se encontró esa meta para el usuario.' };
        }

        return {
          tipo: 'RastreadorMetas' as const,
          props: {
            titulo: meta.titulo,
            porcentaje: meta.porcentaje,
            mensajeAgente,
          },
        };
      },
    }),

    // Próximo bloque (Paso 3 del plan) -> nueva tool aquí, mismo patrón.
  };
}
