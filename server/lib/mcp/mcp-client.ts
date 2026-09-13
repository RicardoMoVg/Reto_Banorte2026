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
  estatus: 'activa' | 'completada' | 'archivada';
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
  { id: 'meta-1', titulo: 'Fondo de emergencia', porcentaje: 62, montoActual: 6200, montoObjetivo: 10000, estatus: 'activa' },
  { id: 'meta-2', titulo: 'Vacaciones diciembre', porcentaje: 30, montoActual: 3000, montoObjetivo: 10000, estatus: 'activa' },
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
    // process.cwd() es server/ (donde corre `npm run dev`); mcp-server/ es
    // hermano de server/ en la raíz del repo, un nivel arriba.
    const mcpServerDir = path.join(process.cwd(), '..', 'mcp-server');

    toolsPromise = createMCPClient({
      transport: new StdioMCPTransport({
        // NO usar command: 'npx' -- en Windows resuelve a npx.cmd, y
        // child_process.spawn (sin shell: true, que StdioConfig no expone)
        // no puede ejecutar un .cmd directo: truena con `spawn npx ENOENT`
        // (confirmado en vivo). En su lugar, se invoca node.exe directo
        // sobre el archivo real de tsx -- un .mjs normal, sin shell de por
        // medio, funciona igual en Windows/Mac/Linux.
        command: process.execPath,
        args: [
          path.join(mcpServerDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
          path.join(mcpServerDir, 'src', 'server.ts'),
        ],
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

  const respuesta = resultado as {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  const contenido = respuesta.content ?? [];
  const bloque = contenido.find((c) => c.type === 'text' && c.text);

  if (!bloque?.text) {
    throw new Error(`Respuesta MCP de "${nombre}" sin contenido de texto.`);
  }

  // Un error del MCP viene con isError y el texto NO es JSON, es un mensaje
  // legible. Sin esta rama, el JSON.parse de abajo lo convertia en
  // "Unexpected token 'M'" y el error real ("limite debe ser <= 50") se
  // perdia -- costo un rato de debug la primera vez que paso.
  if (respuesta.isError) {
    throw new Error(`El servidor MCP rechazo "${nombre}": ${bloque.text}`);
  }

  try {
    return JSON.parse(bloque.text) as T;
  } catch {
    throw new Error(
      `Respuesta MCP de "${nombre}" no es JSON valido: ${bloque.text.slice(0, 200)}`,
    );
  }
}

// ============================================================
// Compartido
// ============================================================

export interface PerfilBanca {
  id: string;
  nombre: string;
}

export async function crearUsuario(userId: string, nombre: string): Promise<PerfilBanca> {
  if (USE_MOCK) return { id: userId, nombre };

  return llamarTool<PerfilBanca>('crear_usuario', { userId, nombre });
}

export async function getUsuario(userId: string): Promise<PerfilBanca | null> {
  if (USE_MOCK) return { id: userId, nombre: 'Usuario Demo' };

  return llamarTool<PerfilBanca | null>('get_usuario', { userId });
}

export async function getMetasUsuario(
  userId: string,
  incluirArchivadas = false,
): Promise<Meta[]> {
  if (USE_MOCK) {
    return incluirArchivadas ? METAS_MOCK : METAS_MOCK.filter((m) => m.estatus !== 'archivada');
  }

  const rows = await llamarTool<
    Array<{
      id: string;
      titulo: string;
      monto_actual: string | number;
      monto_objetivo: string | number;
      porcentaje: string | number;
      estatus: Meta['estatus'];
    }>
  >('get_metas', { userId, incluirArchivadas });

  return rows.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    porcentaje: Number(m.porcentaje),
    montoActual: Number(m.monto_actual),
    montoObjetivo: Number(m.monto_objetivo),
    estatus: m.estatus,
  }));
}

export async function crearMeta(
  userId: string,
  titulo: string,
  montoObjetivo: number,
  montoInicial = 0,
): Promise<Meta> {
  if (USE_MOCK) {
    const meta: Meta = {
      id: `meta-mock-${METAS_MOCK.length + 1}`,
      titulo,
      montoActual: montoInicial,
      montoObjetivo,
      porcentaje: Math.round((montoInicial / montoObjetivo) * 100),
      estatus: 'activa',
    };
    METAS_MOCK.push(meta);
    return meta;
  }

  const m = await llamarTool<{
    id: string;
    titulo: string;
    monto_actual: string | number;
    monto_objetivo: string | number;
    estatus: Meta['estatus'];
  }>('crear_meta', { userId, titulo, montoObjetivo, montoInicial });

  const montoActual = Number(m.monto_actual);
  const montoObjetivoNum = Number(m.monto_objetivo);
  return {
    id: m.id,
    titulo: m.titulo,
    montoActual,
    montoObjetivo: montoObjetivoNum,
    porcentaje: Math.round((montoActual / montoObjetivoNum) * 100),
    estatus: m.estatus,
  };
}

export async function aportarAMeta(userId: string, metaId: string, monto: number): Promise<Meta | { error: string }> {
  if (USE_MOCK) {
    const meta = METAS_MOCK.find((m) => m.id === metaId && m.estatus === 'activa');
    if (!meta) return { error: 'Meta no encontrada o no está activa.' };
    meta.montoActual += monto;
    meta.porcentaje = Math.round((meta.montoActual / meta.montoObjetivo) * 100);
    if (meta.montoActual >= meta.montoObjetivo) meta.estatus = 'completada';
    return meta;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; titulo: string; monto_actual: string | number; monto_objetivo: string | number; estatus: Meta['estatus'] }
  >('aportar_a_meta', { userId, metaId, monto });

  if ('error' in resultado) return resultado;

  const montoActual = Number(resultado.monto_actual);
  const montoObjetivo = Number(resultado.monto_objetivo);
  return {
    id: resultado.id,
    titulo: resultado.titulo,
    montoActual,
    montoObjetivo,
    porcentaje: Math.round((montoActual / montoObjetivo) * 100),
    estatus: resultado.estatus,
  };
}

export async function archivarMeta(userId: string, metaId: string): Promise<Meta | { error: string }> {
  if (USE_MOCK) {
    const meta = METAS_MOCK.find((m) => m.id === metaId);
    if (!meta) return { error: 'Meta no encontrada.' };
    meta.estatus = 'archivada';
    return meta;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; titulo: string; monto_actual: string | number; monto_objetivo: string | number; estatus: Meta['estatus'] }
  >('archivar_meta', { userId, metaId });

  if ('error' in resultado) return resultado;

  const montoActual = Number(resultado.monto_actual);
  const montoObjetivo = Number(resultado.monto_objetivo);
  return {
    id: resultado.id,
    titulo: resultado.titulo,
    montoActual,
    montoObjetivo,
    porcentaje: Math.round((montoActual / montoObjetivo) * 100),
    estatus: resultado.estatus,
  };
}

export interface AportacionProgramada {
  id: string;
  metaId: string;
  monto: number;
  periodicidad: 'semanal' | 'quincenal' | 'mensual';
  fechaInicio: string;
  estatus: 'activa' | 'completada' | 'cancelada';
}

const APORTACIONES_PROGRAMADAS_MOCK: AportacionProgramada[] = [];

export async function crearAportacionProgramada(
  userId: string,
  metaId: string,
  monto: number,
  periodicidad: 'semanal' | 'quincenal' | 'mensual',
  fechaInicio: string,
): Promise<AportacionProgramada | { error: string }> {
  if (USE_MOCK) {
    const meta = METAS_MOCK.find((m) => m.id === metaId && m.estatus === 'activa');
    if (!meta) return { error: 'Meta no encontrada, no pertenece al usuario, o no está activa.' };

    const aportacion: AportacionProgramada = {
      id: `aportacion-mock-${APORTACIONES_PROGRAMADAS_MOCK.length + 1}`,
      metaId,
      monto,
      periodicidad,
      fechaInicio,
      estatus: 'activa',
    };
    APORTACIONES_PROGRAMADAS_MOCK.push(aportacion);
    return aportacion;
  }

  const resultado = await llamarTool<
    | { error: string }
    | {
        id: string;
        meta_id: string;
        monto: string | number;
        periodicidad: AportacionProgramada['periodicidad'];
        fecha_inicio: string;
        estatus: AportacionProgramada['estatus'];
      }
  >('crear_aportacion_programada', { userId, metaId, monto, periodicidad, fechaInicio });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    metaId: resultado.meta_id,
    monto: Number(resultado.monto),
    periodicidad: resultado.periodicidad,
    fechaInicio: resultado.fecha_inicio,
    estatus: resultado.estatus,
  };
}

export async function getAportacionesProgramadas(
  userId: string,
  opciones: { metaId?: string; incluirCanceladas?: boolean } = {},
): Promise<AportacionProgramada[]> {
  const { metaId, incluirCanceladas = false } = opciones;

  if (USE_MOCK) {
    let resultado = incluirCanceladas
      ? APORTACIONES_PROGRAMADAS_MOCK
      : APORTACIONES_PROGRAMADAS_MOCK.filter((a) => a.estatus !== 'cancelada');
    if (metaId) resultado = resultado.filter((a) => a.metaId === metaId);
    return resultado;
  }

  const rows = await llamarTool<
    Array<{
      id: string;
      meta_id: string;
      monto: string | number;
      periodicidad: AportacionProgramada['periodicidad'];
      fecha_inicio: string;
      estatus: AportacionProgramada['estatus'];
    }>
  >('get_aportaciones_programadas', { userId, metaId, incluirCanceladas });

  return rows.map((a) => ({
    id: a.id,
    metaId: a.meta_id,
    monto: Number(a.monto),
    periodicidad: a.periodicidad,
    fechaInicio: a.fecha_inicio,
    estatus: a.estatus,
  }));
}

export async function cancelarAportacionProgramada(
  userId: string,
  aportacionId: string,
): Promise<AportacionProgramada | { error: string }> {
  if (USE_MOCK) {
    const aportacion = APORTACIONES_PROGRAMADAS_MOCK.find((a) => a.id === aportacionId && a.estatus === 'activa');
    if (!aportacion) return { error: 'Plan no encontrado o ya no está activo.' };
    aportacion.estatus = 'cancelada';
    return aportacion;
  }

  const resultado = await llamarTool<
    | { error: string }
    | {
        id: string;
        meta_id: string;
        monto: string | number;
        periodicidad: AportacionProgramada['periodicidad'];
        fecha_inicio: string;
        estatus: AportacionProgramada['estatus'];
      }
  >('cancelar_aportacion_programada', { userId, aportacionId });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    metaId: resultado.meta_id,
    monto: Number(resultado.monto),
    periodicidad: resultado.periodicidad,
    fechaInicio: resultado.fecha_inicio,
    estatus: resultado.estatus,
  };
}

export interface FiltroTransacciones {
  limite?: number;
  categoria?: string;
  desde?: string;
  hasta?: string;
}

export async function getTransaccionesRecientes(
  userId: string,
  { limite = 10, categoria, desde, hasta }: FiltroTransacciones = {},
): Promise<Transaccion[]> {
  if (USE_MOCK) {
    let resultado = TRANSACCIONES_MOCK;
    if (categoria) resultado = resultado.filter((t) => t.categoria === categoria);
    if (desde) resultado = resultado.filter((t) => t.fecha >= desde);
    if (hasta) resultado = resultado.filter((t) => t.fecha <= hasta);
    return resultado.slice(0, limite);
  }

  const rows = await llamarTool<
    Array<{
      id: string;
      descripcion: string;
      monto: string | number;
      categoria: string;
      fecha: string;
    }>
  >('get_transacciones', { userId, limite, categoria, desde, hasta });

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

// ============================================================
// Banca personal (extra)
// ============================================================

export interface Cuenta {
  id: string;
  tipo: string;
  alias: string;
  saldo: number;
}

const CUENTAS_MOCK: Cuenta[] = [
  { id: 'cuenta-1', tipo: 'debito', alias: 'Cuenta principal', saldo: 14696 },
  { id: 'cuenta-2', tipo: 'ahorro', alias: 'Ahorro', saldo: 5000 },
];

export async function getCuentasUsuario(userId: string): Promise<Cuenta[]> {
  if (USE_MOCK) return CUENTAS_MOCK;

  const rows = await llamarTool<
    Array<{ id: string; tipo: string; alias: string; saldo: string | number }>
  >('get_cuentas', { userId });

  return rows.map((c) => ({ id: c.id, tipo: c.tipo, alias: c.alias, saldo: Number(c.saldo) }));
}

export async function crearTransaccion(
  userId: string,
  cuentaId: string,
  descripcion: string,
  monto: number,
  categoria?: string,
): Promise<Transaccion | { error: string }> {
  if (USE_MOCK) {
    const cuenta = CUENTAS_MOCK.find((c) => c.id === cuentaId);
    if (!cuenta) return { error: 'Cuenta no encontrada o no pertenece al usuario.' };

    const transaccion: Transaccion = {
      id: `tx-mock-${TRANSACCIONES_MOCK.length + 1}`,
      descripcion,
      monto,
      fecha: new Date().toISOString(),
      categoria: categoria ?? '',
    };
    TRANSACCIONES_MOCK.push(transaccion);
    cuenta.saldo += monto;
    return transaccion;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; descripcion: string; monto: string | number; categoria: string; fecha: string }
  >('crear_transaccion', { userId, cuentaId, descripcion, monto, categoria });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    descripcion: resultado.descripcion,
    monto: Number(resultado.monto),
    categoria: resultado.categoria,
    fecha: resultado.fecha,
  };
}

// ============================================================
// Inversiones
// ============================================================

export interface Instrumento {
  id: string;
  nombre: string;
  tipo: string;
  riesgo: string;
  rendimientoAnualEstimado: number;
  /** Precio simulado (no es mercado real -- ver mcp-server/src/precios.ts), oscila solo con el tiempo. */
  precioActual: number;
}

const INSTRUMENTOS_MOCK: Instrumento[] = [
  { id: 'inst-1', nombre: 'Fondo Banorte Renta Variable', tipo: 'fondo', riesgo: 'alto', rendimientoAnualEstimado: 11.5, precioActual: 25.5 },
  { id: 'inst-2', nombre: 'CETES 28 días', tipo: 'cetes', riesgo: 'bajo', rendimientoAnualEstimado: 10.8, precioActual: 10.0 },
  { id: 'inst-3', nombre: 'ETF S&P 500', tipo: 'etf', riesgo: 'medio', rendimientoAnualEstimado: 9.2, precioActual: 45.0 },
  { id: 'inst-4', nombre: 'Dólar estadounidense (USD)', tipo: 'divisa', riesgo: 'medio', rendimientoAnualEstimado: 4.5, precioActual: 18.5 },
  { id: 'inst-5', nombre: 'Euro (EUR)', tipo: 'divisa', riesgo: 'medio', rendimientoAnualEstimado: 3.8, precioActual: 20.0 },
];

export async function getInstrumentos(
  opciones: { tipo?: string; riesgo?: string } = {},
): Promise<Instrumento[]> {
  const { tipo, riesgo } = opciones;

  if (USE_MOCK) {
    let resultado = INSTRUMENTOS_MOCK;
    if (tipo) resultado = resultado.filter((i) => i.tipo === tipo);
    if (riesgo) resultado = resultado.filter((i) => i.riesgo === riesgo);
    return resultado;
  }

  const rows = await llamarTool<
    Array<{
      id: string;
      nombre: string;
      tipo: string;
      riesgo: string;
      rendimiento_anual_estimado: string | number;
      precio_actual: string | number;
    }>
  >('get_instrumentos', { tipo, riesgo });

  return rows.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    tipo: i.tipo,
    riesgo: i.riesgo,
    rendimientoAnualEstimado: Number(i.rendimiento_anual_estimado),
    precioActual: Number(i.precio_actual),
  }));
}

export interface PuntoPrecio {
  fecha: string;
  precio: number;
}

export async function getHistorialPrecio(
  instrumentoId: string,
  desde: string,
  hasta: string,
  puntos = 20,
): Promise<PuntoPrecio[] | { error: string }> {
  if (USE_MOCK) {
    const instrumento = INSTRUMENTOS_MOCK.find((i) => i.id === instrumentoId);
    if (!instrumento) return { error: 'Instrumento no encontrado.' };

    const inicio = new Date(desde).getTime();
    const fin = new Date(hasta).getTime();
    const paso = puntos > 1 ? (fin - inicio) / (puntos - 1) : 0;

    return Array.from({ length: puntos }, (_, i) => ({
      fecha: new Date(inicio + paso * i).toISOString(),
      precio: instrumento.precioActual,
    }));
  }

  const resultado = await llamarTool<{ error: string } | PuntoPrecio[]>('get_historial_precio', {
    instrumentoId,
    desde,
    hasta,
    puntos,
  });

  return resultado;
}

export interface PerfilInversion {
  toleranciaRiesgo: string;
  horizonteAnios: number;
}

const PERFIL_INVERSION_MOCK: PerfilInversion = { toleranciaRiesgo: 'moderado', horizonteAnios: 5 };

export async function getPerfilInversion(userId: string): Promise<PerfilInversion | null> {
  if (USE_MOCK) return PERFIL_INVERSION_MOCK;

  const row = await llamarTool<{ tolerancia_riesgo: string; horizonte_anios: number } | null>(
    'get_perfil_inversion',
    { userId },
  );
  if (!row) return null;

  return { toleranciaRiesgo: row.tolerancia_riesgo, horizonteAnios: row.horizonte_anios };
}

export async function actualizarPerfilInversion(
  userId: string,
  toleranciaRiesgo: string,
  horizonteAnios: number,
): Promise<PerfilInversion> {
  if (USE_MOCK) {
    PERFIL_INVERSION_MOCK.toleranciaRiesgo = toleranciaRiesgo;
    PERFIL_INVERSION_MOCK.horizonteAnios = horizonteAnios;
    return PERFIL_INVERSION_MOCK;
  }

  const row = await llamarTool<{ tolerancia_riesgo: string; horizonte_anios: number }>(
    'actualizar_perfil_inversion',
    { userId, toleranciaRiesgo, horizonteAnios },
  );

  return { toleranciaRiesgo: row.tolerancia_riesgo, horizonteAnios: row.horizonte_anios };
}

export interface PosicionPortafolio {
  id: string;
  nombre: string;
  tipo: string;
  riesgo: string;
  rendimientoAnualEstimado: number;
  cantidad: number;
  precioPromedio: number;
  valorInvertido: number;
  activa: boolean;
}

const PORTAFOLIO_MOCK: PosicionPortafolio[] = [
  { id: 'pos-1', nombre: 'Fondo Banorte Renta Variable', tipo: 'fondo', riesgo: 'alto', rendimientoAnualEstimado: 11.5, cantidad: 100, precioPromedio: 25.5, valorInvertido: 2550, activa: true },
  { id: 'pos-2', nombre: 'CETES 28 días', tipo: 'cetes', riesgo: 'bajo', rendimientoAnualEstimado: 10.8, cantidad: 500, precioPromedio: 10, valorInvertido: 5000, activa: true },
];

export async function getPortafolioUsuario(
  userId: string,
  incluirVendidas = false,
): Promise<PosicionPortafolio[]> {
  if (USE_MOCK) {
    return incluirVendidas ? PORTAFOLIO_MOCK : PORTAFOLIO_MOCK.filter((p) => p.activa);
  }

  const rows = await llamarTool<
    Array<{
      id: string;
      nombre: string;
      tipo: string;
      riesgo: string;
      rendimiento_anual_estimado: string | number;
      cantidad: string | number;
      precio_promedio: string | number;
      valor_invertido: string | number;
      activa: boolean;
    }>
  >('get_portafolio', { userId, incluirVendidas });

  return rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    riesgo: p.riesgo,
    rendimientoAnualEstimado: Number(p.rendimiento_anual_estimado),
    cantidad: Number(p.cantidad),
    precioPromedio: Number(p.precio_promedio),
    valorInvertido: Number(p.valor_invertido),
    activa: p.activa,
  }));
}

export interface PosicionMutada {
  id: string;
  cantidad: number;
  precioPromedio: number;
  activa: boolean;
}

export async function comprarPosicion(
  userId: string,
  instrumentoId: string,
  cantidad: number,
  precioCompra: number,
): Promise<PosicionMutada> {
  if (USE_MOCK) {
    const instrumento = INSTRUMENTOS_MOCK.find((i) => i.id === instrumentoId);
    const existente = PORTAFOLIO_MOCK.find((p) => p.id.startsWith('pos-') && p.activa && p.nombre === instrumento?.nombre);

    if (existente) {
      const nueva = existente.cantidad + cantidad;
      existente.precioPromedio = (existente.cantidad * existente.precioPromedio + cantidad * precioCompra) / nueva;
      existente.cantidad = nueva;
      existente.valorInvertido = existente.cantidad * existente.precioPromedio;
      return { id: existente.id, cantidad: existente.cantidad, precioPromedio: existente.precioPromedio, activa: true };
    }

    const nueva: PosicionPortafolio = {
      id: `pos-mock-${PORTAFOLIO_MOCK.length + 1}`,
      nombre: instrumento?.nombre ?? instrumentoId,
      tipo: instrumento?.tipo ?? '',
      riesgo: instrumento?.riesgo ?? '',
      rendimientoAnualEstimado: instrumento?.rendimientoAnualEstimado ?? 0,
      cantidad,
      precioPromedio: precioCompra,
      valorInvertido: cantidad * precioCompra,
      activa: true,
    };
    PORTAFOLIO_MOCK.push(nueva);
    return { id: nueva.id, cantidad: nueva.cantidad, precioPromedio: nueva.precioPromedio, activa: true };
  }

  const p = await llamarTool<{ id: string; cantidad: string | number; precio_promedio: string | number; activa: boolean }>(
    'comprar_posicion',
    { userId, instrumentoId, cantidad, precioCompra },
  );

  return { id: p.id, cantidad: Number(p.cantidad), precioPromedio: Number(p.precio_promedio), activa: p.activa };
}

export async function venderPosicion(
  userId: string,
  posicionId: string,
  cantidad?: number,
): Promise<PosicionMutada | { error: string }> {
  if (USE_MOCK) {
    const pos = PORTAFOLIO_MOCK.find((p) => p.id === posicionId && p.activa);
    if (!pos) return { error: 'Posición no encontrada o ya está vendida.' };

    const aVender = cantidad ?? pos.cantidad;
    if (aVender > pos.cantidad) return { error: 'No se puede vender más de lo que se tiene.' };

    if (aVender === pos.cantidad) {
      pos.activa = false;
    } else {
      pos.cantidad -= aVender;
      pos.valorInvertido = pos.cantidad * pos.precioPromedio;
    }
    return { id: pos.id, cantidad: pos.cantidad, precioPromedio: pos.precioPromedio, activa: pos.activa };
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; cantidad: string | number; precio_promedio: string | number; activa: boolean }
  >('vender_posicion', { userId, posicionId, cantidad });

  if ('error' in resultado) return resultado;

  return { id: resultado.id, cantidad: Number(resultado.cantidad), precioPromedio: Number(resultado.precio_promedio), activa: resultado.activa };
}

export interface SimulacionInversion {
  instrumento: string;
  montoInicial: number;
  anios: number;
  rendimientoAnualEstimado: number;
  valorFinalEstimado: number;
  gananciaEstimada: number;
}

export async function simularInversion(
  instrumentoId: string,
  monto: number,
  anios: number,
): Promise<SimulacionInversion | { error: string }> {
  if (USE_MOCK) {
    const instrumento = INSTRUMENTOS_MOCK.find((i) => i.id === instrumentoId);
    if (!instrumento) return { error: 'Instrumento no encontrado.' };

    const valorFinal = monto * Math.pow(1 + instrumento.rendimientoAnualEstimado / 100, anios);
    return {
      instrumento: instrumento.nombre,
      montoInicial: monto,
      anios,
      rendimientoAnualEstimado: instrumento.rendimientoAnualEstimado,
      valorFinalEstimado: Math.round(valorFinal * 100) / 100,
      gananciaEstimada: Math.round((valorFinal - monto) * 100) / 100,
    };
  }

  return llamarTool<SimulacionInversion | { error: string }>('simular_inversion', { instrumentoId, monto, anios });
}

// ============================================================
// Crédito
// ============================================================

export interface ProductoCredito {
  id: string;
  tipo: string;
  nombre: string;
  tasaReferencia: number;
  montoMaximo: number;
  plazoMaximoMeses: number;
  descripcion: string | null;
}

const PRODUCTOS_CREDITO_MOCK: ProductoCredito[] = [
  { id: 'prod-personal', tipo: 'personal', nombre: 'Crédito Personal Banorte', tasaReferencia: 32.4, montoMaximo: 300000, plazoMaximoMeses: 48, descripcion: 'Sin garantía, para cualquier fin' },
  { id: 'prod-hipotecario', tipo: 'hipotecario', nombre: 'Crédito Hipotecario Banorte', tasaReferencia: 11.8, montoMaximo: 5000000, plazoMaximoMeses: 240, descripcion: 'Para compra de vivienda' },
  { id: 'prod-automotriz', tipo: 'automotriz', nombre: 'Crédito Automotriz Banorte', tasaReferencia: 14.5, montoMaximo: 800000, plazoMaximoMeses: 60, descripcion: 'Para compra de auto nuevo o seminuevo' },
  { id: 'prod-tarjeta', tipo: 'tarjeta', nombre: 'Tarjeta de Crédito Banorte', tasaReferencia: 32.4, montoMaximo: 200000, plazoMaximoMeses: 1, descripcion: 'Línea revolvente, sin plazo fijo' },
];

export async function getProductosCredito(tipo?: string): Promise<ProductoCredito[]> {
  if (USE_MOCK) {
    return tipo ? PRODUCTOS_CREDITO_MOCK.filter((p) => p.tipo === tipo) : PRODUCTOS_CREDITO_MOCK;
  }

  const rows = await llamarTool<
    Array<{
      id: string;
      tipo: string;
      nombre: string;
      tasa_referencia: string | number;
      monto_maximo: string | number;
      plazo_maximo_meses: number;
      descripcion: string | null;
    }>
  >('get_productos_credito', { tipo });

  return rows.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    nombre: p.nombre,
    tasaReferencia: Number(p.tasa_referencia),
    montoMaximo: Number(p.monto_maximo),
    plazoMaximoMeses: p.plazo_maximo_meses,
    descripcion: p.descripcion,
  }));
}

export interface SimulacionPlanPago {
  monto: number;
  plazoMeses: number;
  tasaAnual: number;
  pagoMensual: number;
  totalPagado: number;
  totalIntereses: number;
}

export async function simularPlanPago(
  monto: number,
  plazoMeses: number,
  tasaAnual?: number,
): Promise<SimulacionPlanPago> {
  if (USE_MOCK) {
    const tasa = tasaAnual ?? PRODUCTOS_CREDITO_MOCK.find((p) => p.tipo === 'personal')?.tasaReferencia ?? 32.4;
    const tasaMensual = tasa / 100 / 12;
    const pagoMensual =
      tasaMensual === 0 ? monto / plazoMeses : (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
    const totalPagado = pagoMensual * plazoMeses;

    return {
      monto,
      plazoMeses,
      tasaAnual: tasa,
      pagoMensual: Math.round(pagoMensual * 100) / 100,
      totalPagado: Math.round(totalPagado * 100) / 100,
      totalIntereses: Math.round((totalPagado - monto) * 100) / 100,
    };
  }

  return llamarTool<SimulacionPlanPago>('simular_plan_pago', { monto, plazoMeses, tasaAnual });
}

export interface TarjetaCredito {
  id: string;
  alias: string;
  limiteCredito: number;
  saldoActual: number;
  tasaAnual: number;
}

const TARJETAS_CREDITO_MOCK: TarjetaCredito[] = [
  { id: 'tarjeta-1', alias: 'Tarjeta Oro', limiteCredito: 20000, saldoActual: 18400, tasaAnual: 32.4 },
];

export async function getTarjetasCredito(userId: string): Promise<TarjetaCredito[]> {
  if (USE_MOCK) return TARJETAS_CREDITO_MOCK;

  const rows = await llamarTool<
    Array<{ id: string; alias: string; limite_credito: string | number; saldo_actual: string | number; tasa_anual: string | number }>
  >('get_tarjetas_credito', { userId });

  return rows.map((t) => ({
    id: t.id,
    alias: t.alias,
    limiteCredito: Number(t.limite_credito),
    saldoActual: Number(t.saldo_actual),
    tasaAnual: Number(t.tasa_anual),
  }));
}

export interface CompraTarjeta {
  id: string;
  tarjetaId: string;
  descripcion: string;
  monto: number;
  fecha: string;
  mesesMsi: number | null;
}

const COMPRAS_TARJETA_MOCK: CompraTarjeta[] = [
  { id: 'compra-1', tarjetaId: 'tarjeta-1', descripcion: 'Pantalla LED 55"', monto: 12000, fecha: new Date().toISOString(), mesesMsi: 12 },
  { id: 'compra-2', tarjetaId: 'tarjeta-1', descripcion: 'Supermercado', monto: 6400, fecha: new Date().toISOString(), mesesMsi: null },
];

export async function crearCompraTarjeta(
  userId: string,
  tarjetaId: string,
  descripcion: string,
  monto: number,
): Promise<CompraTarjeta | { error: string }> {
  if (USE_MOCK) {
    const existeTarjeta = TARJETAS_CREDITO_MOCK.some((t) => t.id === tarjetaId);
    if (!existeTarjeta) return { error: 'Tarjeta no encontrada o no pertenece al usuario.' };

    const compra: CompraTarjeta = {
      id: `compra-mock-${COMPRAS_TARJETA_MOCK.length + 1}`,
      tarjetaId,
      descripcion,
      monto,
      fecha: new Date().toISOString(),
      mesesMsi: null,
    };
    COMPRAS_TARJETA_MOCK.push(compra);
    return compra;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; descripcion: string; monto: string | number; fecha: string; meses_msi: number | null }
  >('crear_compra_tarjeta', { userId, tarjetaId, descripcion, monto });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    tarjetaId,
    descripcion: resultado.descripcion,
    monto: Number(resultado.monto),
    fecha: resultado.fecha,
    mesesMsi: resultado.meses_msi,
  };
}

export async function getComprasTarjeta(
  userId: string,
  tarjetaId?: string,
): Promise<CompraTarjeta[]> {
  if (USE_MOCK) {
    return tarjetaId ? COMPRAS_TARJETA_MOCK.filter((c) => c.tarjetaId === tarjetaId) : COMPRAS_TARJETA_MOCK;
  }

  const rows = await llamarTool<
    Array<{ id: string; tarjeta_id: string; descripcion: string; monto: string | number; fecha: string; meses_msi: number | null }>
  >('get_compras_tarjeta', { userId, tarjetaId });

  return rows.map((c) => ({
    id: c.id,
    tarjetaId: c.tarjeta_id,
    descripcion: c.descripcion,
    monto: Number(c.monto),
    fecha: c.fecha,
    mesesMsi: c.meses_msi,
  }));
}

export async function diferirAMsi(
  userId: string,
  compraId: string,
  mesesMsi: number,
): Promise<CompraTarjeta | { error: string }> {
  if (USE_MOCK) {
    const compra = COMPRAS_TARJETA_MOCK.find((c) => c.id === compraId && c.mesesMsi == null);
    if (!compra) return { error: 'Compra no encontrada, no pertenece al usuario, o ya está diferida.' };
    compra.mesesMsi = mesesMsi;
    return compra;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; tarjeta_id: string; descripcion: string; monto: string | number; fecha: string; meses_msi: number | null }
  >('diferir_a_msi', { userId, compraId, mesesMsi });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    tarjetaId: resultado.tarjeta_id,
    descripcion: resultado.descripcion,
    monto: Number(resultado.monto),
    fecha: resultado.fecha,
    mesesMsi: resultado.meses_msi,
  };
}

export interface PlanPago {
  id: string;
  plazoMeses: number;
  cat: number;
  pagoMensual: number;
}

const PLANES_PAGO_MOCK: PlanPago[] = [
  { id: 'plan-1', plazoMeses: 12, cat: 32.4, pagoMensual: 1690 },
  { id: 'plan-2', plazoMeses: 18, cat: 34.1, pagoMensual: 1215 },
  { id: 'plan-3', plazoMeses: 24, cat: 36.0, pagoMensual: 980 },
];

export async function getPlanesPago(tarjetaId: string): Promise<PlanPago[]> {
  if (USE_MOCK) return PLANES_PAGO_MOCK;

  const rows = await llamarTool<
    Array<{ id: string; plazo_meses: number; cat: string | number; pago_mensual: string | number }>
  >('get_planes_pago', { tarjetaId });

  return rows.map((p) => ({
    id: p.id,
    plazoMeses: p.plazo_meses,
    cat: Number(p.cat),
    pagoMensual: Number(p.pago_mensual),
  }));
}

export interface SolicitudCredito {
  id: string;
  tipo: string;
  montoSolicitado: number;
  estatus: string;
  fecha: string;
}

const SOLICITUDES_CREDITO_MOCK: SolicitudCredito[] = [
  { id: 'sol-1', tipo: 'personal', montoSolicitado: 15000, estatus: 'pendiente', fecha: new Date().toISOString() },
];

export async function getSolicitudesCredito(userId: string): Promise<SolicitudCredito[]> {
  if (USE_MOCK) return SOLICITUDES_CREDITO_MOCK;

  const rows = await llamarTool<
    Array<{ id: string; tipo: string; monto_solicitado: string | number; estatus: string; fecha: string }>
  >('get_solicitudes_credito', { userId });

  return rows.map((s) => ({
    id: s.id,
    tipo: s.tipo,
    montoSolicitado: Number(s.monto_solicitado),
    estatus: s.estatus,
    fecha: s.fecha,
  }));
}

export async function crearSolicitudCredito(
  userId: string,
  tipo: 'personal' | 'hipotecario' | 'automotriz' | 'tarjeta',
  montoSolicitado: number,
): Promise<SolicitudCredito> {
  if (USE_MOCK) {
    const solicitud: SolicitudCredito = {
      id: `sol-mock-${SOLICITUDES_CREDITO_MOCK.length + 1}`,
      tipo,
      montoSolicitado,
      estatus: 'pendiente',
      fecha: new Date().toISOString(),
    };
    SOLICITUDES_CREDITO_MOCK.push(solicitud);
    return solicitud;
  }

  const s = await llamarTool<{ id: string; tipo: string; monto_solicitado: string | number; estatus: string; fecha: string }>(
    'crear_solicitud_credito',
    { userId, tipo, montoSolicitado },
  );

  return { id: s.id, tipo: s.tipo, montoSolicitado: Number(s.monto_solicitado), estatus: s.estatus, fecha: s.fecha };
}

export async function cancelarSolicitudCredito(
  userId: string,
  solicitudId: string,
): Promise<SolicitudCredito | { error: string }> {
  if (USE_MOCK) {
    const solicitud = SOLICITUDES_CREDITO_MOCK.find((s) => s.id === solicitudId && s.estatus === 'pendiente');
    if (!solicitud) return { error: 'Solicitud no encontrada o ya no está pendiente.' };
    solicitud.estatus = 'cancelada';
    return solicitud;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; tipo: string; monto_solicitado: string | number; estatus: string; fecha: string }
  >('cancelar_solicitud_credito', { userId, solicitudId });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    tipo: resultado.tipo,
    montoSolicitado: Number(resultado.monto_solicitado),
    estatus: resultado.estatus,
    fecha: resultado.fecha,
  };
}

// ============================================================
// Pagos
// ============================================================

export interface ContactoPago {
  id: string;
  nombre: string;
  clabe: string | null;
  activo: boolean;
}

const CONTACTOS_PAGO_MOCK: ContactoPago[] = [
  { id: 'contacto-1', nombre: 'María López', clabe: '012180012345678901', activo: true },
];

export interface FiltroContactosPago {
  nombre?: string;
  incluirInactivos?: boolean;
}

export async function getContactosPago(
  userId: string,
  { nombre, incluirInactivos = false }: FiltroContactosPago = {},
): Promise<ContactoPago[]> {
  if (USE_MOCK) {
    let resultado = incluirInactivos ? CONTACTOS_PAGO_MOCK : CONTACTOS_PAGO_MOCK.filter((c) => c.activo);
    if (nombre) resultado = resultado.filter((c) => c.nombre.toLowerCase().includes(nombre.toLowerCase()));
    return resultado;
  }

  const rows = await llamarTool<Array<{ id: string; nombre: string; clabe: string | null; activo: boolean }>>(
    'get_contactos_pago',
    { userId, nombre, incluirInactivos },
  );

  return rows.map((c) => ({ id: c.id, nombre: c.nombre, clabe: c.clabe, activo: c.activo }));
}

export async function crearContactoPago(
  userId: string,
  nombre: string,
  clabe?: string,
): Promise<ContactoPago> {
  if (USE_MOCK) {
    const contacto: ContactoPago = {
      id: `contacto-mock-${CONTACTOS_PAGO_MOCK.length + 1}`,
      nombre,
      clabe: clabe ?? null,
      activo: true,
    };
    CONTACTOS_PAGO_MOCK.push(contacto);
    return contacto;
  }

  const c = await llamarTool<{ id: string; nombre: string; clabe: string | null; activo: boolean }>(
    'crear_contacto_pago',
    { userId, nombre, clabe },
  );

  return { id: c.id, nombre: c.nombre, clabe: c.clabe, activo: c.activo };
}

export async function desactivarContactoPago(
  userId: string,
  contactoId: string,
): Promise<ContactoPago | { error: string }> {
  if (USE_MOCK) {
    const contacto = CONTACTOS_PAGO_MOCK.find((c) => c.id === contactoId);
    if (!contacto) return { error: 'Contacto no encontrado.' };
    contacto.activo = false;
    return contacto;
  }

  return llamarTool<{ error: string } | ContactoPago>('desactivar_contacto_pago', { userId, contactoId });
}

export interface Transferencia {
  id: string;
  tipo: string;
  monto: number;
  concepto: string | null;
  estatus: string;
  fecha: string;
  contacto: string | null;
}

const TRANSFERENCIAS_MOCK: Transferencia[] = [
  { id: 'transferencia-1', tipo: 'enviada', monto: 500, concepto: 'Renta', estatus: 'completada', fecha: new Date().toISOString(), contacto: 'María López' },
  { id: 'transferencia-2', tipo: 'recibida', monto: 300, concepto: 'Pago compartido', estatus: 'completada', fecha: new Date().toISOString(), contacto: 'María López' },
];

export interface FiltroTransferencias {
  limite?: number;
  tipo?: 'enviada' | 'recibida';
  estatus?: 'pendiente' | 'completada' | 'fallida' | 'cancelada';
}

export async function getTransferenciasRecientes(
  userId: string,
  { limite = 10, tipo, estatus }: FiltroTransferencias = {},
): Promise<Transferencia[]> {
  if (USE_MOCK) {
    let resultado = TRANSFERENCIAS_MOCK;
    if (tipo) resultado = resultado.filter((t) => t.tipo === tipo);
    if (estatus) resultado = resultado.filter((t) => t.estatus === estatus);
    return resultado.slice(0, limite);
  }

  const rows = await llamarTool<
    Array<{
      id: string;
      tipo: string;
      monto: string | number;
      concepto: string | null;
      estatus: string;
      fecha: string;
      contacto: string | null;
    }>
  >('get_transferencias', { userId, limite, tipo, estatus });

  return rows.map((t) => ({
    id: t.id,
    tipo: t.tipo,
    monto: Number(t.monto),
    concepto: t.concepto,
    estatus: t.estatus,
    fecha: t.fecha,
    contacto: t.contacto,
  }));
}

export async function crearTransferencia(
  userId: string,
  contactoId: string,
  monto: number,
  concepto?: string,
  tipo: 'enviada' | 'recibida' = 'enviada',
): Promise<Transferencia | { error: string }> {
  if (USE_MOCK) {
    const contacto = CONTACTOS_PAGO_MOCK.find((c) => c.id === contactoId && c.activo);
    if (!contacto) return { error: 'Contacto no encontrado, inactivo, o no pertenece al usuario.' };

    const transferencia: Transferencia = {
      id: `transferencia-mock-${TRANSFERENCIAS_MOCK.length + 1}`,
      tipo,
      monto,
      concepto: concepto ?? null,
      estatus: 'completada',
      fecha: new Date().toISOString(),
      contacto: contacto.nombre,
    };
    TRANSFERENCIAS_MOCK.push(transferencia);
    return transferencia;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; tipo: string; monto: string | number; concepto: string | null; estatus: string; fecha: string }
  >('crear_transferencia', { userId, contactoId, monto, concepto, tipo });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    tipo: resultado.tipo,
    monto: Number(resultado.monto),
    concepto: resultado.concepto,
    estatus: resultado.estatus,
    fecha: resultado.fecha,
    contacto: null,
  };
}

export async function cancelarTransferencia(
  userId: string,
  transferenciaId: string,
): Promise<Transferencia | { error: string }> {
  if (USE_MOCK) {
    const transferencia = TRANSFERENCIAS_MOCK.find((t) => t.id === transferenciaId && t.estatus === 'pendiente');
    if (!transferencia) return { error: 'Transferencia no encontrada o ya no está pendiente.' };
    transferencia.estatus = 'cancelada';
    return transferencia;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; tipo: string; monto: string | number; concepto: string | null; estatus: string; fecha: string }
  >('cancelar_transferencia', { userId, transferenciaId });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    tipo: resultado.tipo,
    monto: Number(resultado.monto),
    concepto: resultado.concepto,
    estatus: resultado.estatus,
    fecha: resultado.fecha,
    contacto: null,
  };
}

// ============================================================
// Seguros
// ============================================================

export interface PolizaSeguro {
  id: string;
  tipo: string;
  cobertura: string;
  primaMensual: number;
  vigenciaFin: string;
  estatus: string;
}

const POLIZAS_SEGURO_MOCK: PolizaSeguro[] = [
  { id: 'poliza-1', tipo: 'auto', cobertura: 'Cobertura amplia', primaMensual: 850, vigenciaFin: '2027-06-30', estatus: 'activa' },
  { id: 'poliza-2', tipo: 'vida', cobertura: 'Cobertura básica', primaMensual: 400, vigenciaFin: '2027-01-15', estatus: 'cotizada' },
];

export async function getPolizasSeguro(userId: string): Promise<PolizaSeguro[]> {
  if (USE_MOCK) return POLIZAS_SEGURO_MOCK;

  const rows = await llamarTool<
    Array<{ id: string; tipo: string; cobertura: string; prima_mensual: string | number; vigencia_fin: string; estatus: string }>
  >('get_polizas_seguro', { userId });

  return rows.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    cobertura: p.cobertura,
    primaMensual: Number(p.prima_mensual),
    vigenciaFin: p.vigencia_fin,
    estatus: p.estatus,
  }));
}

export async function cotizarPoliza(
  userId: string,
  tipo: 'auto' | 'vida' | 'gmm' | 'hogar',
  cobertura: string,
  primaMensual: number,
  vigenciaFin: string,
): Promise<PolizaSeguro> {
  if (USE_MOCK) {
    const poliza: PolizaSeguro = {
      id: `poliza-mock-${POLIZAS_SEGURO_MOCK.length + 1}`,
      tipo,
      cobertura,
      primaMensual,
      vigenciaFin,
      estatus: 'cotizada',
    };
    POLIZAS_SEGURO_MOCK.push(poliza);
    return poliza;
  }

  const p = await llamarTool<{
    id: string;
    tipo: string;
    cobertura: string;
    prima_mensual: string | number;
    vigencia_fin: string;
    estatus: string;
  }>('cotizar_poliza', { userId, tipo, cobertura, primaMensual, vigenciaFin });

  return { id: p.id, tipo: p.tipo, cobertura: p.cobertura, primaMensual: Number(p.prima_mensual), vigenciaFin: p.vigencia_fin, estatus: p.estatus };
}

type PolizaCruda = {
  id: string;
  tipo: string;
  cobertura: string;
  prima_mensual: string | number;
  vigencia_fin: string;
  estatus: string;
};

function mapearPoliza(p: PolizaCruda): PolizaSeguro {
  return { id: p.id, tipo: p.tipo, cobertura: p.cobertura, primaMensual: Number(p.prima_mensual), vigenciaFin: p.vigencia_fin, estatus: p.estatus };
}

export async function activarPoliza(userId: string, polizaId: string): Promise<PolizaSeguro | { error: string }> {
  if (USE_MOCK) {
    const poliza = POLIZAS_SEGURO_MOCK.find((p) => p.id === polizaId && p.estatus === 'cotizada');
    if (!poliza) return { error: 'Póliza no encontrada o no está cotizada.' };
    poliza.estatus = 'activa';
    return poliza;
  }

  const resultado = await llamarTool<{ error: string } | PolizaCruda>('activar_poliza', { userId, polizaId });
  return 'error' in resultado ? resultado : mapearPoliza(resultado);
}

export async function cancelarPoliza(userId: string, polizaId: string): Promise<PolizaSeguro | { error: string }> {
  if (USE_MOCK) {
    const poliza = POLIZAS_SEGURO_MOCK.find((p) => p.id === polizaId && (p.estatus === 'cotizada' || p.estatus === 'activa'));
    if (!poliza) return { error: 'Póliza no encontrada o ya no se puede cancelar.' };
    poliza.estatus = 'cancelada';
    return poliza;
  }

  const resultado = await llamarTool<{ error: string } | PolizaCruda>('cancelar_poliza', { userId, polizaId });
  return 'error' in resultado ? resultado : mapearPoliza(resultado);
}

export interface Siniestro {
  id: string;
  descripcion: string;
  montoReclamado: number | null;
  estatus: string;
  fecha: string;
  tipoPoliza: string;
}

const SINIESTROS_MOCK: Siniestro[] = [
  { id: 'siniestro-1', descripcion: 'Choque leve en estacionamiento', montoReclamado: 12000, estatus: 'en_revision', fecha: new Date().toISOString(), tipoPoliza: 'auto' },
];

export async function getSiniestrosUsuario(userId: string): Promise<Siniestro[]> {
  if (USE_MOCK) return SINIESTROS_MOCK;

  const rows = await llamarTool<
    Array<{
      id: string;
      descripcion: string;
      monto_reclamado: string | number | null;
      estatus: string;
      fecha: string;
      tipo_poliza: string;
    }>
  >('get_siniestros', { userId });

  return rows.map((s) => ({
    id: s.id,
    descripcion: s.descripcion,
    montoReclamado: s.monto_reclamado == null ? null : Number(s.monto_reclamado),
    estatus: s.estatus,
    fecha: s.fecha,
    tipoPoliza: s.tipo_poliza,
  }));
}

export async function crearSiniestro(
  userId: string,
  polizaId: string,
  descripcion: string,
  montoReclamado?: number,
): Promise<Omit<Siniestro, 'tipoPoliza'> | { error: string }> {
  if (USE_MOCK) {
    const poliza = POLIZAS_SEGURO_MOCK.find((p) => p.id === polizaId && p.estatus === 'activa');
    if (!poliza) return { error: 'Póliza no encontrada o no está activa.' };

    const siniestro: Siniestro = {
      id: `siniestro-mock-${SINIESTROS_MOCK.length + 1}`,
      descripcion,
      montoReclamado: montoReclamado ?? null,
      estatus: 'en_revision',
      fecha: new Date().toISOString(),
      tipoPoliza: poliza.tipo,
    };
    SINIESTROS_MOCK.push(siniestro);
    return siniestro;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; descripcion: string; monto_reclamado: string | number | null; estatus: string; fecha: string }
  >('crear_siniestro', { userId, polizaId, descripcion, montoReclamado });

  if ('error' in resultado) return resultado;

  return {
    id: resultado.id,
    descripcion: resultado.descripcion,
    montoReclamado: resultado.monto_reclamado == null ? null : Number(resultado.monto_reclamado),
    estatus: resultado.estatus,
    fecha: resultado.fecha,
  };
}

// ============================================================
// Educación financiera
// ============================================================

export interface DiagnosticoFinanciero {
  puntaje: number;
  fecha: string;
}

const DIAGNOSTICO_MOCK: DiagnosticoFinanciero = { puntaje: 72, fecha: new Date().toISOString() };

export async function getDiagnosticoFinanciero(
  userId: string,
): Promise<DiagnosticoFinanciero | null> {
  if (USE_MOCK) return DIAGNOSTICO_MOCK;

  return llamarTool<DiagnosticoFinanciero | null>('get_diagnostico_financiero', { userId });
}

export async function crearDiagnosticoFinanciero(
  userId: string,
  puntaje: number,
): Promise<DiagnosticoFinanciero> {
  if (USE_MOCK) {
    DIAGNOSTICO_MOCK.puntaje = puntaje;
    DIAGNOSTICO_MOCK.fecha = new Date().toISOString();
    return DIAGNOSTICO_MOCK;
  }

  return llamarTool<DiagnosticoFinanciero>('crear_diagnostico_financiero', { userId, puntaje });
}

export interface HabitoFinanciero {
  id: string;
  habito: string;
  rachaDias: number;
  activo: boolean;
}

const HABITOS_MOCK: HabitoFinanciero[] = [
  { id: 'habito-1', habito: 'Ahorro automático semanal', rachaDias: 6, activo: true },
  { id: 'habito-2', habito: 'Revisar gastos cada domingo', rachaDias: 3, activo: true },
];

export async function getHabitosFinancieros(
  userId: string,
  incluirInactivos = false,
): Promise<HabitoFinanciero[]> {
  if (USE_MOCK) {
    return incluirInactivos ? HABITOS_MOCK : HABITOS_MOCK.filter((h) => h.activo);
  }

  const rows = await llamarTool<Array<{ id: string; habito: string; racha_dias: number; activo: boolean }>>(
    'get_habitos_financieros',
    { userId, incluirInactivos },
  );

  return rows.map((h) => ({ id: h.id, habito: h.habito, rachaDias: h.racha_dias, activo: h.activo }));
}

export async function crearHabitoFinanciero(userId: string, habito: string): Promise<HabitoFinanciero> {
  if (USE_MOCK) {
    const nuevo: HabitoFinanciero = {
      id: `habito-mock-${HABITOS_MOCK.length + 1}`,
      habito,
      rachaDias: 0,
      activo: true,
    };
    HABITOS_MOCK.push(nuevo);
    return nuevo;
  }

  const h = await llamarTool<{ id: string; habito: string; racha_dias: number; activo: boolean }>(
    'crear_habito_financiero',
    { userId, habito },
  );

  return { id: h.id, habito: h.habito, rachaDias: h.racha_dias, activo: h.activo };
}

export async function actualizarRachaHabito(
  userId: string,
  habitoId: string,
  dias: number,
): Promise<HabitoFinanciero | { error: string }> {
  if (USE_MOCK) {
    const habito = HABITOS_MOCK.find((h) => h.id === habitoId && h.activo);
    if (!habito) return { error: 'Hábito no encontrado o no está activo.' };
    habito.rachaDias = Math.max(habito.rachaDias + dias, 0);
    return habito;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; habito: string; racha_dias: number; activo: boolean }
  >('actualizar_racha_habito', { userId, habitoId, dias });

  if ('error' in resultado) return resultado;

  return { id: resultado.id, habito: resultado.habito, rachaDias: resultado.racha_dias, activo: resultado.activo };
}

export async function desactivarHabito(userId: string, habitoId: string): Promise<HabitoFinanciero | { error: string }> {
  if (USE_MOCK) {
    const habito = HABITOS_MOCK.find((h) => h.id === habitoId);
    if (!habito) return { error: 'Hábito no encontrado.' };
    habito.activo = false;
    return habito;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; habito: string; racha_dias: number; activo: boolean }
  >('desactivar_habito', { userId, habitoId });

  if ('error' in resultado) return resultado;

  return { id: resultado.id, habito: resultado.habito, rachaDias: resultado.racha_dias, activo: resultado.activo };
}
