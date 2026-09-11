'use server';

import { streamUI, getMutableAIState } from '@ai-sdk/rsc';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { RastreadorMetas } from '@/components/generative/RastreadorMetas';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import type { AI } from './ai';

/**
 * El orquestador (capa "LLM" del A2UI). Recibe el mensaje del usuario,
 * lo agrega al AIState (historial que se le manda al modelo), y deja que
 * el modelo decida entre responder en texto o invocar una tool que
 * devuelve un componente de React ya renderizado.
 *
 * Esto es lo que distingue A2UI de un chatbot normal: `generate` no
 * devuelve JSON para que el cliente interprete — devuelve JSX real, que
 * viaja al cliente como parte del stream de React Server Components.
 */
export async function enviarMensaje(input: string) {
  const history = getMutableAIState<typeof AI>();

  history.update([...history.get(), { role: 'user', content: input }]);

  const result = await streamUI({
    model: anthropic('claude-sonnet-5'),
    system: SYSTEM_PROMPT,
    messages: history.get(),

    // Respuesta en texto plano (cuando el modelo no necesita ninguna tool).
    text: ({ content, done }) => {
      if (done) {
        history.done([...history.get(), { role: 'assistant', content }]);
      }
      return <p className="text-sm text-neutral-800">{content}</p>;
    },

    tools: {
      mostrarProgresoMeta: {
        description:
          'Muestra visualmente el progreso de una meta de ahorro o hábito ' +
          'financiero del usuario usando el componente RastreadorMetas. ' +
          'Úsala siempre que el usuario pregunte por su avance en vez de ' +
          'describir el porcentaje en texto.',
        parameters: z.object({
          titulo: z
            .string()
            .describe('Título de la meta financiera, ej. "Fondo de emergencia".'),
          porcentaje: z
            .number()
            .min(0)
            .max(100)
            .describe('Porcentaje de avance de la meta, de 0 a 100.'),
          mensajeAgente: z
            .string()
            .describe(
              'Mensaje breve (una línea) y motivador del agente sobre este avance.',
            ),
        }),
        generate: async function* ({ titulo, porcentaje, mensajeAgente }) {
          // Placeholder mientras se resuelve el tool call — Framer Motion
          // en RastreadorMetas se encarga de la entrada suave del real.
          yield (
            <div className="h-24 w-full max-w-md animate-pulse rounded-xl bg-neutral-100" />
          );

          // TODO(MCP): aquí es donde se conectará la llamada real al
          // servidor MCP (lib/mcp/mcp-client.ts -> getMetasUsuario(userId))
          // para traer `titulo` y `porcentaje` reales de Postgres en vez de
          // los que el modelo generó, y solo dejar que el modelo controle
          // `mensajeAgente` (el framing humano). Por ahora el componente se
          // llena con los parámetros que generó el modelo.

          history.done([
            ...history.get(),
            {
              role: 'assistant',
              content: `Mostré el progreso de "${titulo}": ${porcentaje}%.`,
            },
          ]);

          return (
            <RastreadorMetas
              titulo={titulo}
              porcentaje={porcentaje}
              mensajeAgente={mensajeAgente}
            />
          );
        },
      },
    },
  });

  return {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    display: result.value,
  };
}
