import { streamText, type LanguageModel } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { buildA2uiTools } from '@/lib/ai/a2ui-tools';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';

export const runtime = 'nodejs';

/**
 * API JSON del A2UI-lite — puerta de entrada para el cliente RN (y para
 * cualquier otro cliente que quiera hablar el protocolo NDJSON).
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

/**
 * Proveedores en orden de preferencia. Gemini primero (más barato/rápido);
 * OpenAI de respaldo si Gemini falla (cuota agotada, 503 de alta demanda,
 * etc. — ver README, el free tier de Gemini da muy pocas requests/día).
 *
 * Ambos usan `@ai-sdk/*` (no la API cruda de cada proveedor) para poder
 * reusar exactamente el mismo `tools`/`streamText` — el fallback no pierde
 * la capacidad de invocar tools ni de generar bloques A2UI.
 */
const PROVEEDORES: Array<{ nombre: string; model: LanguageModel }> = [
  { nombre: 'gemini', model: google('gemini-3.6-flash') },
  { nombre: 'openai', model: openai('gpt-4o-mini') },
];

/**
 * Intenta cada proveedor en orden. Si uno falla ANTES de emitir cualquier
 * contenido (texto o tool-result), se reintenta con el siguiente — un fallo
 * a medio stream no se reintenta (ya se le mandó algo al cliente, reiniciar
 * duplicaría contenido).
 */
/**
 * Turno de la conversación tal como lo manda el cliente.
 *
 * El historial viaja en cada request y NO se guarda aquí: este endpoint
 * sigue siendo stateless por diseño (constitution.md 3.1 -- el historial
 * vive solo en el dispositivo y nunca sube a Postgres). Agregar un store
 * de conversaciones en el servidor seria el atajo que esa seccion prohibe.
 */
interface TurnoCliente {
  rol: 'user' | 'asistente';
  contenido: string;
}

/** Cuántos turnos se aceptan, y qué tan largo puede ser cada uno. */
const MAX_TURNOS = 20;
const MAX_CARACTERES = 2000;

/**
 * Normaliza lo que llegó en el body. El cliente es nuestro, pero igual se
 * acota: un historial sin tope es una factura de tokens abierta, y basta
 * un bug del cliente para mandar miles de turnos.
 */
function aMensajesDelModelo(historial: unknown) {
  if (!Array.isArray(historial)) return [];

  return historial
    .filter((t): t is TurnoCliente => !!t && typeof (t as TurnoCliente).contenido === 'string')
    .slice(-MAX_TURNOS)
    .map((t) => ({
      role: t.rol === 'user' ? ('user' as const) : ('assistant' as const),
      content: t.contenido.slice(0, MAX_CARACTERES),
    }));
}

async function* generarEventos(
  message: string,
  historial: unknown,
  esDecision: boolean,
): AsyncGenerator<EventoA2ui> {
  /**
   * En el turno en que el usuario responde una tarjeta de acción, el
   * modelo NO recibe tools.
   *
   * Medido: sin esto, "Acepto el plan para tu fondo de emergencia" hacía
   * que volviera a invocar `proponerPlanAhorro` en 2 de cada 3 intentos.
   * El mensaje se parece demasiado a "quiero un plan" y la descripción de
   * la tool le gana al system prompt. Pedirle por prompt que no lo haga es
   * apostar a que obedezca; quitarle la herramienta lo vuelve imposible.
   */
  const tools = esDecision ? undefined : buildA2uiTools(USER_ID);
  const turnosPrevios = aMensajesDelModelo(historial);

  for (let i = 0; i < PROVEEDORES.length; i++) {
    const { nombre, model } = PROVEEDORES[i];
    const esUltimoIntento = i === PROVEEDORES.length - 1;

    const result = streamText({
      model,
      maxRetries: 0,
      system: SYSTEM_PROMPT,
      messages: [...turnosPrevios, { role: 'user', content: message }],
      tools,
      maxSteps: 1,
    });

    let huboContenido = false;
    let error: unknown = null;

    try {
      for await (const part of result.fullStream) {
        if (part.type === 'error') {
          error = part.error;
          break;
        }

        if (part.type === 'text-delta') {
          huboContenido = true;
          yield { type: 'text', content: part.textDelta };
        } else if (part.type === 'tool-result') {
          const salida = part.result as { tipo?: string; props?: unknown; error?: string };
          huboContenido = true;
          if (salida?.tipo) {
            yield { type: 'surface', tipo: salida.tipo, props: salida.props };
          } else {
            // La tool regresó un error de negocio (ej. "no se encontró esa
            // meta") en vez de un bloque -- nunca se descarta en silencio.
            yield { type: 'text', content: salida?.error ?? 'No se pudo generar la respuesta.' };
          }
        }
      }
    } catch (err) {
      error = err;
    }

    if (!error) return; // este proveedor respondió bien, listo

    console.warn(`[agent] proveedor "${nombre}" falló:`, error);

    if (huboContenido || esUltimoIntento) {
      yield {
        type: 'error',
        message: huboContenido
          ? `El proveedor "${nombre}" falló a medio stream: ${String(error)}`
          : `Todos los proveedores fallaron. Último error (${nombre}): ${String(error)}`,
      };
      return;
    }
    // si no hubo contenido y no es el último, sigue al siguiente proveedor
  }
}

export async function POST(req: Request) {
  const { message, historial, esDecision } = (await req.json()) as {
    message: string;
    historial?: unknown;
    esDecision?: boolean;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: EventoA2ui) => {
        controller.enqueue(encoder.encode(JSON.stringify(evento) + '\n'));
      };

      try {
        for await (const evento of generarEventos(message, historial, esDecision === true)) {
          enviar(evento);
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
