'use server';

import { streamUI, getMutableAIState } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import { construirBloques } from '@/lib/ai/bloques';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import type { HistorialMutable, MensajeUI } from '@/lib/ai/rsc-types';

/**
 * MOTOR AI-TO-UI (A2UI)
 * =====================
 *
 * Punto único donde el modelo deja de producir texto y empieza a producir
 * interfaz. Implementa la capa 1 (LLM como orquestador) del protocolo:
 * recibe el mensaje del usuario, lo agrega al AIState (el historial que se
 * le manda al modelo) y deja que el modelo decida entre responder en texto
 * o invocar un bloque.
 *
 * Lo que distingue AI-to-UI de un chatbot normal: los bloques no devuelven
 * JSON para que el cliente lo interprete y dibuje — devuelven JSX ya
 * renderizado, que viaja al cliente dentro del stream de React Server
 * Components (de ahí `streamUI`, y de ahí que esto sea una Server Action y
 * no un Route Handler).
 *
 * Las tres capas y dónde vive cada una:
 *   1. LLM   -> este archivo
 *   2. MCP   -> lib/mcp/mcp-client.ts   (pendiente de conectar, ver TODO)
 *   3. A2UI  -> components/ai-to-ui/    (el catálogo de bloques)
 *
 * El mapeo decisión-del-modelo -> bloque vive en lib/ai/bloques.tsx.
 */
// El tipo de retorno es explícito a propósito: sin él, TS no puede cerrar
// el ciclo AI -> generateUIFromAI -> AI y todo termina en `any`.
export async function generateUIFromAI(input: string): Promise<MensajeUI> {
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
