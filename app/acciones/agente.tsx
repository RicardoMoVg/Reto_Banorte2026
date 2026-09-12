'use server';

import { streamUI, getMutableAIState } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import { construirBloques } from '@/lib/ai/bloques';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import type { HistorialMutable, MensajeUI } from '@/lib/ai/rsc-types';

/**
 * El orquestador (capa "LLM" del A2UI). Recibe el mensaje del usuario, lo
 * agrega al AIState (historial que se le manda al modelo), y deja que el
 * modelo decida entre responder en texto o invocar una tool que devuelve un
 * componente de React ya renderizado.
 *
 * Esto es lo que distingue A2UI de un chatbot normal: las tools no devuelven
 * JSON para que el cliente lo interprete — devuelven JSX real, que viaja al
 * cliente como parte del stream de React Server Components.
 *
 * El catálogo de bloques vive en lib/ai/bloques.tsx.
 */
// El tipo de retorno es explícito a propósito: sin él, TS no puede cerrar
// el ciclo AI -> enviarMensaje -> AI y todo termina en `any`.
export async function enviarMensaje(input: string): Promise<MensajeUI> {
  const history = getMutableAIState() as HistorialMutable;

  history.update([...history.get(), { role: 'user', content: input }]);

  const result = await streamUI({
    model: google('gemini-flash-latest'),
    // 0 reintentos a proposito. El default (3) con el retry-after largo
    // que manda Gemini en los 429 hace que una peticion tarde >30s en
    // fallar. Si la cuota esta agotada reintentar no sirve de nada, y en
    // un demo es mejor fallar en 1s. Subir a 1-2 si dan cuota de pago.
    maxRetries: 0,
    system: SYSTEM_PROMPT,
    messages: history.get(),

    // Respuesta en texto plano (cuando el modelo no necesita ninguna tool).
    text: ({ content, done }) => {
      if (done) {
        history.done([...history.get(), { role: 'assistant', content }]);
      }
      return <p className="text-sm leading-relaxed text-neutral-800">{content}</p>;
    },

    tools: construirBloques(history),
  });

  return {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    display: result.value,
  };
}
