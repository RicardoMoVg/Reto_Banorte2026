import path from 'node:path';
import { experimental_createMCPClient as createMCPClient } from 'ai';

/**
 * Cliente hacia nuestro servidor MCP (mcp-server/). Esta es la ÚNICA puerta
 * de entrada al protocolo MCP: `app/api/chat/route.ts` nunca habla MCP
 * directamente, solo llama a estas funciones tipadas.
 *
 * Importante: el modelo NUNCA ve las tools crudas del MCP (get_metas,
 * get_transacciones...). Solo ve las tools "de UI" definidas en route.ts
 * (ej. mostrarRastreadorMeta), que internamente llaman a estas funciones.
 * Así mantenemos el control de qué puede disparar la IA.
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

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

/**
 * Modo mock: mientras no haya un Postgres real (DATABASE_URL sin definir),
 * respondemos con datos en memoria y NUNCA intentamos levantar el proceso
 * hijo del MCP server. Así el agente (route.ts) se puede construir y probar
 * hoy mismo; el día que exista la base, esto se vuelve transparente — no
 * hay que tocar route.ts ni los bloques de LEGO, solo definir DATABASE_URL.
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
  { id: 'tx-2', descripcion: 'Depósito nómina', monto: 15000, fecha: new Date().toISOString(), categoria: 'ingreso' },
];

let clientPromise: Promise<MCPClient> | null = null;

function getClient(): Promise<MCPClient> {
  if (!clientPromise) {
    clientPromise = createMCPClient({
      transport: {
        type: 'stdio',
        // Levantamos el servidor MCP como proceso hijo vía stdio. Para
        // producción/deploy en serverless, cambiar a transporte SSE contra
        // un mcp-server desplegado aparte (ver README).
        command: 'npx',
        args: ['tsx', path.join(process.cwd(), 'mcp-server/src/server.ts')],
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? '' } as Record<string, string>,
      },
    });
  }
  return clientPromise;
}

/** Extrae y parsea el primer bloque de texto de una respuesta MCP. */
function parseToolResult<T>(result: { content: Array<{ type: string; text?: string }> }): T {
  const block = result.content.find((c) => c.type === 'text');
  if (!block?.text) {
    throw new Error('Respuesta MCP sin contenido de texto parseable.');
  }
  return JSON.parse(block.text) as T;
}

export async function getMetasUsuario(userId: string): Promise<Meta[]> {
  if (USE_MOCK) return METAS_MOCK;

  const client = await getClient();
  const result = await client.callTool({
    name: 'get_metas',
    arguments: { userId },
  });

  const rows = parseToolResult<
    Array<{
      id: string;
      titulo: string;
      monto_actual: string | number;
      monto_objetivo: string | number;
      porcentaje: string | number;
    }>
  >(result);

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

  const client = await getClient();
  const result = await client.callTool({
    name: 'get_transacciones',
    arguments: { userId, limite },
  });

  const rows = parseToolResult<
    Array<{
      id: string;
      descripcion: string;
      monto: string | number;
      categoria: string;
      fecha: string;
    }>
  >(result);

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

  const client = await getClient();
  const result = await client.callTool({
    name: 'get_saldo',
    arguments: { userId },
  });

  const { saldo } = parseToolResult<{ saldo: string | number }>(result);
  return Number(saldo);
}
