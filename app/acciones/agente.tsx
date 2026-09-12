'use server';

import { streamUI, getMutableAIState } from '@ai-sdk/rsc';
import { anthropic } from '@ai-sdk/anthropic';
import { construirBloques } from '@/lib/ai/bloques';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import type { AI } from './ai';

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
