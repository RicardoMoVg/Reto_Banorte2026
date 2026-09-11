import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { buildTools } from '@/lib/ai/tools';

export const maxDuration = 30;

/**
 * El "agente": modelo + system prompt + tools + loop multi-paso.
 *
 * `maxSteps` es lo que convierte tool-calling simple en un agente: después
 * de ejecutar una tool, el SDK vuelve a llamar al modelo con el resultado
 * ya insertado en la conversación, y el modelo decide si necesita llamar
 * OTRA tool o si ya puede responder en texto. Sin esto (maxSteps: 1, el
 * default), el modelo llamaría una tool y ahí se acabaría el turno.
 */
export async function POST(req: Request) {
  const { messages, userId = 'demo-user' } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-5'),
    system: SYSTEM_PROMPT,
    messages,
    tools: buildTools(userId),
    maxSteps: 5,
    onStepFinish({ toolCalls }) {
      // Barato y útil en demo: ver en la consola del server qué bloques
      // decidió invocar el agente en cada paso.
      if (toolCalls.length > 0) {
        console.log(
          '[agente] tool calls:',
          toolCalls.map((c) => c.toolName).join(', '),
        );
      }
    },
  });

  return result.toDataStreamResponse();
}
