import { streamText, type LanguageModel } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { buildA2uiTools, type WidgetTablero } from '@/lib/ai/a2ui-tools';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { esEjecutable, ejecutar, type Ejecucion } from '@/lib/ai/ejecutables';
import { requireUsuario } from '@/lib/auth/supabase';
import { CORS_HEADERS } from '@/lib/http/cors';

export const runtime = 'nodejs';

/**
 * API JSON del A2UI-lite — puerta de entrada para el cliente RN (y para
 * cualquier otro cliente que quiera hablar el protocolo NDJSON).
 *
 * El userId sale de `requireUsuario` (el token de Supabase Auth que manda
 * el cliente), igual que el resto de endpoints -- antes estaba fijo a
 * 'demo-user' sin importar quién hubiera iniciado sesión, así que
 * cualquier usuario real leía y escribía los datos de demo-user.
 */

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

type EventoA2ui =
  | { type: 'text'; content: string }
  // `tool`/`parametros`: la receta para rehidratar el bloque sin pasar por
  // el modelo (constitution.md 3.2/4.1) -- antes se perdían en el camino,
  // el cliente nunca sabía qué tool ni con qué argumentos produjo el
  // bloque, así que "anclar" no tenía nada real que guardar.
  | { type: 'surface'; tipo: string; props: unknown; tool?: string; parametros?: unknown }
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

/** Cuantos widgets del tablero se aceptan por request. */
const MAX_WIDGETS = 20;

/**
 * Normaliza el tablero que reporta el cliente.
 *
 * Llega en cada request por la misma razon que el historial: el servidor
 * es stateless (constitution.md 3.1) y el tablero vive en el cliente. Se
 * acota igual que el historial -- una lista sin tope es una factura de
 * tokens abierta.
 *
 * Nota de seguridad barata: aqui NUNCA entra un dato financiero. Solo id,
 * nombre del bloque, titulo y posicion; los montos de cada widget se
 * quedan en el dispositivo.
 */
function aWidgetsDelTablero(tablero: unknown): WidgetTablero[] {
  if (!Array.isArray(tablero)) return [];

  return tablero
    .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
    .slice(0, MAX_WIDGETS)
    .map((w, i) => ({
      id: String(w.id ?? '').slice(0, 80),
      nombre: String(w.nombre ?? '').slice(0, 80),
      titulo: String(w.titulo ?? w.nombre ?? 'Sin titulo').slice(0, 120),
      posicion: typeof w.posicion === 'number' ? w.posicion : i + 1,
      ancho: w.ancho === 'medio' ? ('medio' as const) : ('completo' as const),
      lado: w.lado === 'derecha' ? ('derecha' as const) : ('izquierda' as const),
    }))
    .filter((w) => w.id !== '');
}

/**
 * El tablero, escrito para que el modelo lo pueda leer y referenciar.
 *
 * Va como turno de sistema del propio request y no dentro del
 * SYSTEM_PROMPT porque cambia en cada peticion: el prompt es estatico y
 * cacheable, esto no.
 */
function contextoDelTablero(widgets: WidgetTablero[]) {
  if (widgets.length === 0) {
    return 'Tablero actual del usuario: vacio (no ha fijado ningun bloque en su Inicio todavia).';
  }

  const lineas = widgets.map(
    (w) =>
      `${w.posicion}. "${w.titulo}" (${w.nombre}) -- ancho ${w.ancho}` +
      (w.ancho === 'medio' ? ` a la ${w.lado}` : '') +
      ` -- id="${w.id}"`,
  );

  return (
    'Tablero actual del usuario, de arriba hacia abajo. Para acomodarlo usa `acomodarTablero`; ' +
    'referencia cada widget por su NUMERO de esta lista (tambien acepta el titulo o el id, ' +
    'pero el numero es el que no se presta a equivocaciones):\n' +
    lineas.join('\n')
  );
}

async function* generarEventos(
  userId: string,
  message: string,
  historial: unknown,
  esDecision: boolean,
  tablero: WidgetTablero[],
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
  const tools = esDecision ? undefined : buildA2uiTools(userId, tablero);
  const turnosPrevios = aMensajesDelModelo(historial);

  for (let i = 0; i < PROVEEDORES.length; i++) {
    const { nombre, model } = PROVEEDORES[i];
    const esUltimoIntento = i === PROVEEDORES.length - 1;

    const result = streamText({
      model,
      maxRetries: 0,
      system: `${SYSTEM_PROMPT}\n\n${contextoDelTablero(tablero)}`,
      messages: [...turnosPrevios, { role: 'user', content: message }],
      tools,
      /**
       * Cuantas rondas de tools puede encadenar el modelo en un turno.
       *
       * Se queda en 1 A PROPOSITO, y varios bloques por turno igual
       * funcionan: el modelo puede emitir VARIAS llamadas a tools en una
       * sola ronda (llamadas paralelas), y todas se ejecutan. Lo que hacia
       * falta no era subir este numero, sino decirselo en el system prompt.
       *
       * Subirlo rompe con Gemini 3: al mandar de vuelta los resultados para
       * una segunda ronda, la API exige un `thought_signature` en las
       * partes functionCall que el @ai-sdk/google instalado no propaga, y
       * revienta con "Function call is missing a thought_signature" DESPUES
       * de haber emitido los bloques -- el usuario veia sus tarjetas y
       * luego un error rojo. Si algun dia hace falta encadenar de verdad
       * (consultar ids y luego referenciarlos), hay que actualizar el
       * proveedor primero.
       */
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
            yield {
              type: 'surface',
              tipo: salida.tipo,
              props: salida.props,
              tool: part.toolName,
              parametros: part.args,
            };
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

/**
 * Atajo para cuando el usuario confirma una tarjeta que trae receta de
 * ejecucion: se corre la operacion y se devuelve su bloque, SIN llamar al
 * modelo.
 *
 * Que no pase por el LLM es el punto, no una optimizacion: el monto y el
 * destinatario ya los valido y fijo la tool que propuso. Volver a
 * preguntarle al modelo abriria la puerta a que se equivoque de contacto o
 * de cifra justo en el paso que mueve el dinero.
 */
async function* generarEjecucion(userId: string, ejecucion: Ejecucion): AsyncGenerator<EventoA2ui> {
  try {
    const salida = await ejecutar(userId, ejecucion);
    if ('error' in salida) {
      yield { type: 'text', content: salida.error };
      return;
    }
    yield { type: 'surface', tipo: salida.tipo, props: salida.props, tool: ejecucion.tool, parametros: ejecucion.args };
  } catch (err) {
    console.error('[agent] fallo la ejecucion confirmada:', err);
    yield { type: 'error', message: `No se pudo completar la operacion: ${String(err)}` };
  }
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { message, historial, esDecision, ejecucion, tablero } = (await req.json()) as {
    message: string;
    historial?: unknown;
    esDecision?: boolean;
    ejecucion?: Ejecucion;
    /** Widgets fijados en Inicio, para que el agente los pueda acomodar. */
    tablero?: unknown;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: EventoA2ui) => {
        controller.enqueue(encoder.encode(JSON.stringify(evento) + '\n'));
      };

      try {
        // Una receta de ejecucion solo se acepta si esta en la lista
        // blanca de lib/ai/ejecutables.ts: el nombre lo manda el cliente,
        // y sin acotarlo esto seria "ejecuta lo que te pidan por HTTP".
        if (ejecucion && esEjecutable(ejecucion.tool)) {
          for await (const evento of generarEjecucion(auth.id, ejecucion)) {
            enviar(evento);
          }
        } else {
          for await (const evento of generarEventos(
            auth.id,
            message,
            historial,
            esDecision === true,
            aWidgetsDelTablero(tablero),
          )) {
            enviar(evento);
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
