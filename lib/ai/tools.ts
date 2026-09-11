import { tool } from 'ai';
import { z } from 'zod';
import { getMetasUsuario } from '@/lib/mcp/mcp-client';

/**
 * Catálogo de tools que el agente puede invocar. Cada tool corresponde 1:1
 * a un bloque de LEGO (components/ui-blocks) — nunca al revés. El nombre de
 * la tool es exactamente el que el cliente usa en su `switch` para elegir
 * el componente (ver app/page.tsx).
 *
 * IMPORTANTE: estas son las ÚNICAS tools que el modelo ve. Nunca exponemos
 * aquí las tools crudas del MCP (get_metas, get_transacciones...) — eso
 * mantiene control total sobre qué puede disparar la IA y qué forma tienen
 * los datos que llegan a los componentes.
 *
 * `userId` se recibe por request (viene del auth de la sesión, no del
 * modelo) y se cierra sobre las tools para que cada llamada quede aislada
 * al usuario correcto.
 */
export function buildTools(userId: string) {
  return {
    mostrarRastreadorMeta: tool({
      description:
        'Consulta el MCP y obtiene los datos para renderizar el bloque de UI ' +
        'RastreadorMetas (barra de progreso) de una meta financiera del usuario.',
      parameters: z.object({
        metaId: z
          .string()
          .optional()
          .describe(
            'Id de la meta a mostrar. Si no se especifica, se usa la meta con menor avance.',
          ),
      }),
      execute: async ({ metaId }) => {
        const metas = await getMetasUsuario(userId);
        const meta = metaId ? metas.find((m) => m.id === metaId) : metas[0];

        if (!meta) {
          return { error: 'No se encontró esa meta para el usuario.' };
        }

        return {
          titulo: meta.titulo,
          porcentaje: meta.porcentaje,
          montoActual: meta.montoActual,
          montoObjetivo: meta.montoObjetivo,
        };
      },
    }),

    // Próximo bloque de LEGO -> nueva tool aquí, mismo patrón:
    // description clara (el modelo elige la tool SOLO por esto) + execute
    // llamando a una función de lib/mcp/mcp-client.ts.
  };
}

export type ToolName = keyof ReturnType<typeof buildTools>;
