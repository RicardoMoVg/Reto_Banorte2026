'use server';

import { streamUI, getMutableAIState } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import OpenAI from 'openai';
import { construirBloques } from '@/lib/ai/bloques';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import type { HistorialMutable, MensajeUI } from '@/lib/ai/rsc-types';

let pendingAbort: AbortController | null = null;

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
 *
 * Patrón de fallback: intenta Gemini primero, y si falla (ej. "high demand")
 * cambia automáticamente a OpenAI GPT-4o-mini para garantizar disponibilidad.
 */
// El tipo de retorno es explícito a propósito: sin él, TS no puede cerrar
// el ciclo AI -> enviarMensaje -> AI y todo termina en `any`.
export async function enviarMensaje(input: string): Promise<MensajeUI> {
  const history = getMutableAIState() as HistorialMutable;

  // Cancelar cualquier petición previa para evitar que .update() falle
  // en un stream ya cerrado (error: "UI stream is already closed")
  pendingAbort?.abort();
  pendingAbort = new AbortController();

  history.update([...history.get(), { role: 'user', content: input }]);

  // Intento 1: Gemini
  try {
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
      abortSignal: pendingAbort?.signal,
    });

    return {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      display: result.value,
    };
  } catch (geminiError) {
    // Gemini falló - intentar OpenAI como respaldo
    console.warn('Gemini falló, intentando OpenAI...', geminiError);

    try {
      const openaiError: any = geminiError;

      // Construir el prompt para OpenAI
      const prompt = history.get().map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: typeof msg.content === 'string' ? msg.content : '',
      }));

      // Llamada a OpenAI GPT-4o-mini
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: prompt as any,
        temperature: 0,
        max_tokens: 1000,
      });

      const assistantMessage = response.choices[0]?.message?.content || '';

      return {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        display: (
          <p className="text-sm leading-relaxed text-neutral-800">
            {assistantMessage}
          </p>
        ),
      };
    } catch (openaiError) {
      // Ambos modelos fallaron
      console.error('OpenAI también falló:', openaiError);

      return {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        display: (
          <p className="text-red-600 text-sm">
            El servicio de IA está saturado en este momento. Por favor,
            inténtalo de nuevo en unos minutos.
          </p>
        ),
      };
    }
  }
}