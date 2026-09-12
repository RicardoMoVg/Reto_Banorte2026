import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { buildA2uiTools } from '@/lib/ai/a2ui-tools';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';

export const runtime = 'nodejs';

/**
 * API JSON del A2UI-lite — puerta de entrada para el cliente RN (y para
 * cualquier otro cliente que quiera hablar el protocolo NDJSON en vez de
 * consumir RSC). Convive con app/acciones/agente.tsx (chat web) sin tocarlo.
 *
 * Paso 1 del plan de migración: un solo mensaje sin historial todavía (se
 * agrega en un paso posterior si se necesita conversación multi-turno).
 *
 * Sin auth: userId fijo a 'demo-user', el mismo que siembra
 * mcp-server/src/seed.ts y usan los mocks de lib/mcp/mcp-client.ts.
 */
const USER_ID = 'demo-user';

/**
 * CORS abierto: en dev, el cliente RN corre en otro origen (Expo web en su
 * propio puerto; la app nativa no aplica CORS pero no estorba tenerlo).
 * Endurecer/quitar antes de producción si el API queda expuesto público.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

type EventoA2ui =
  | { type: 'text'; content: string }
  | { type: 'surface'; tipo: string; props: unknown }
  | { type: 'done' }
  | { type: 'error'; message: string };

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message: string };

  const result = streamText({
    model: google('gemini-3.6-flash'),
    maxRetries: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message }],
    tools: buildA2uiTools(USER_ID),
    maxSteps: 1,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: EventoA2ui) => {
        controller.enqueue(encoder.encode(JSON.stringify(evento) + '\n'));
      };

      try {
        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            enviar({ type: 'text', content: part.textDelta });
          } else if (part.type === 'tool-result') {
            const salida = part.result as { tipo?: string; props?: unknown };
            if (salida?.tipo) {
              enviar({ type: 'surface', tipo: salida.tipo, props: salida.props });
            }
          } else if (part.type === 'error') {
            enviar({ type: 'error', message: String(part.error) });
          }
        }
        enviar({ type: 'done' });
      } catch (err) {
        enviar({ type: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', ...CORS_HEADERS },
  });
}
