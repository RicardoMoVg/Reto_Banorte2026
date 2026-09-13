import path from 'node:path';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

/**
 * Cliente hacia nuestro servidor MCP (mcp-server/). Esta es la ÚNICA puerta
 * de entrada al protocolo MCP: el resto de la app solo llama a las funciones
 * tipadas de abajo.
 *
 * Importante: el modelo NUNCA ve las tools crudas del MCP (get_metas,
 * get_transacciones...). Solo ve las tools A2UI de lib/ai/a2ui-tools.ts,
 * que internamente llaman a estas funciones. Así mantenemos el control de
 * qué puede disparar la IA.
 */

export interface Meta {
  id: string;
  titulo: string;
  porcentaje: number;
  montoActual: number;
  montoObjetivo: number;
}

export interface Transaccion {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  categoria: string;
}

/**
 * Modo mock: mientras no haya un Postgres real (DATABASE_URL sin definir),
 * respondemos con datos en memoria y NUNCA levantamos el proceso hijo del
 * MCP server. Así el resto de la app se puede construir y probar hoy; el día
 * que exista la base, definir DATABASE_URL y esto se vuelve transparente.
 */
const USE_MOCK = !process.env.DATABASE_URL;

if (USE_MOCK) {
  console.warn(
    '[mcp-client] DATABASE_URL no configurado — usando datos MOCK en memoria. ' +
      'Define DATABASE_URL cuando levanten Postgres para hablar con el MCP real.',
  );
}

const METAS_MOCK: Meta[] = [
  { id: 'meta-1', titulo: 'Fondo de emergencia', porcentaje: 62, montoActual: 6200, montoObjetivo: 10000 },
  { id: 'meta-2', titulo: 'Vacaciones diciembre', porcentaje: 30, montoActual: 3000, montoObjetivo: 10000 },
];

const TRANSACCIONES_MOCK: Transaccion[] = [
  { id: 'tx-1', descripcion: 'Café Starbucks', monto: -85, fecha: new Date().toISOString(), categoria: 'comida' },
  { id: 'tx-2', descripcion: 'Billar', monto: -200, fecha: new Date().toISOString(), categoria: 'diversion' },
  { id: 'tx-3', descripcion: 'Depósito nómina', monto: 15000, fecha: new Date().toISOString(), categoria: 'ingreso' },
];

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type MCPTools = Awaited<ReturnType<MCPClient['tools']>>;

let toolsPromise: Promise<MCPTools> | null = null;

/**
 * Conecta al MCP server por stdio y cachea su set de tools.
 *
 * Ojo con la API de ai@4: `callTool` del cliente es privado. Lo público es
 * `.tools()`, que devuelve las tools del MCP ya envueltas como tools del
 * AI SDK — cada una con su propio `execute`.
 *
 * Para deploy en serverless conviene cambiar a transporte SSE contra un
 * mcp-server desplegado aparte (ver README).
 */
function getTools(): Promise<MCPTools> {
  if (!toolsPromise) {
    toolsPromise = createMCPClient({
      transport: new StdioMCPTransport({
        command: 'npx',
        // process.cwd() es server/ (donde corre `npm run dev`); mcp-server/
        // es hermano de server/ en la raíz del repo, un nivel arriba.
        args: ['tsx', path.join(process.cwd(), '..', 'mcp-server/src/server.ts')],
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL ?? '',
        } as Record<string, string>,
      }),
    }).then((client) => client.tools());
  }
  return toolsPromise;
}

/**
 * Invoca una tool del MCP y parsea su respuesta JSON.
 *
 * `execute` espera ToolExecutionOptions porque normalmente lo llama el
 * modelo dentro de un tool call. Aquí lo llamamos nosotros a mano, así que
 * le pasamos un contexto vacío.
 */
async function llamarTool<T>(
  nombre: string,
  args: Record<string, unknown>,
): Promise<T> {
  const tools = await getTools();
  const tool = tools[nombre];

  if (!tool) {
    throw new Error(`El servidor MCP no expone la tool "${nombre}".`);
  }

  const resultado = await tool.execute(args, {
    toolCallId: `manual-${nombre}`,
    messages: [],
  });

  const contenido =
    (resultado as { content?: Array<{ type: string; text?: string }> })
      .content ?? [];
  const bloque = contenido.find((c) => c.type === 'text' && c.text);

  if (!bloque?.text) {
    throw new Error(`Respuesta MCP de "${nombre}" sin contenido de texto.`);
  }

  return JSON.parse(bloque.text) as T;
}

export async function getMetasUsuario(userId: string): Promise<Meta[]> {
  if (USE_MOCK) return METAS_MOCK;

  const rows = await llamarTool<
    Array<{
      id: string;
      titulo: string;
      monto_actual: string | number;
      monto_objetivo: string | number;
      porcentaje: string | number;
    }>
  >('get_metas', { userId });

  return rows.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    porcentaje: Number(m.porcentaje),
    montoActual: Number(m.monto_actual),
    montoObjetivo: Number(m.monto_objetivo),
  }));
}

export async function getTransaccionesRecientes(
  userId: string,
  limite = 10,
): Promise<Transaccion[]> {
  if (USE_MOCK) return TRANSACCIONES_MOCK.slice(0, limite);

  const rows = await llamarTool<
    Array<{
      id: string;
      descripcion: string;
      monto: string | number;
      categoria: string;
      fecha: string;
    }>
  >('get_transacciones', { userId, limite });

  return rows.map((t) => ({
    id: t.id,
    descripcion: t.descripcion,
    monto: Number(t.monto),
    fecha: t.fecha,
    categoria: t.categoria,
  }));
}

export async function getSaldoUsuario(userId: string): Promise<number> {
  if (USE_MOCK) return TRANSACCIONES_MOCK.reduce((acc, t) => acc + t.monto, 0);

  const { saldo } = await llamarTool<{ saldo: string | number }>('get_saldo', {
    userId,
  });
  return Number(saldo);
}
