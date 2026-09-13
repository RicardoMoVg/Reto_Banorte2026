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
  { id: 'tx-2', descripcion: 'Depósito nómina', monto: 15000, fecha: new Date().toISOString(), categoria: 'ingreso' },
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

  const contenido =
    (resultado as { content?: Array<{ type: string; text?: string }> })
      .content ?? [];
  const bloque = contenido.find((c) => c.type === 'text' && c.text);

  if (!bloque?.text) {
    throw new Error(`Respuesta MCP de "${nombre}" sin contenido de texto.`);
  }

  return JSON.parse(bloque.text) as T;
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

export async function aportarAMeta(metaId: string, monto: number): Promise<Meta | { error: string }> {
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
  >('aportar_a_meta', { metaId, monto });

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

export async function archivarMeta(metaId: string): Promise<Meta | { error: string }> {
  if (USE_MOCK) {
    const meta = METAS_MOCK.find((m) => m.id === metaId);
    if (!meta) return { error: 'Meta no encontrada.' };
    meta.estatus = 'archivada';
    return meta;
  }

  const resultado = await llamarTool<
    | { error: string }
    | { id: string; titulo: string; monto_actual: string | number; monto_objetivo: string | number; estatus: Meta['estatus'] }
  >('archivar_meta', { metaId });

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

export interface PosicionPortafolio {
  id: string;
  nombre: string;
  tipo: string;
  riesgo: string;
  rendimientoAnualEstimado: number;
  cantidad: number;
  precioPromedio: number;
  valorInvertido: number;
}

const PORTAFOLIO_MOCK: PosicionPortafolio[] = [
  { id: 'pos-1', nombre: 'Fondo Banorte Renta Variable', tipo: 'fondo', riesgo: 'alto', rendimientoAnualEstimado: 11.5, cantidad: 100, precioPromedio: 25.5, valorInvertido: 2550 },
  { id: 'pos-2', nombre: 'CETES 28 días', tipo: 'cetes', riesgo: 'bajo', rendimientoAnualEstimado: 10.8, cantidad: 500, precioPromedio: 10, valorInvertido: 5000 },
];

export async function getPortafolioUsuario(userId: string): Promise<PosicionPortafolio[]> {
  if (USE_MOCK) return PORTAFOLIO_MOCK;

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
    }>
  >('get_portafolio', { userId });

  return rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    riesgo: p.riesgo,
    rendimientoAnualEstimado: Number(p.rendimiento_anual_estimado),
    cantidad: Number(p.cantidad),
    precioPromedio: Number(p.precio_promedio),
    valorInvertido: Number(p.valor_invertido),
  }));
}

// ============================================================
// Crédito
// ============================================================

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

export async function getContactosPago(
  userId: string,
  incluirInactivos = false,
): Promise<ContactoPago[]> {
  if (USE_MOCK) {
    return incluirInactivos ? CONTACTOS_PAGO_MOCK : CONTACTOS_PAGO_MOCK.filter((c) => c.activo);
  }

  const rows = await llamarTool<Array<{ id: string; nombre: string; clabe: string | null; activo: boolean }>>(
    'get_contactos_pago',
    { userId, incluirInactivos },
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
  contactoId: string,
): Promise<ContactoPago | { error: string }> {
  if (USE_MOCK) {
    const contacto = CONTACTOS_PAGO_MOCK.find((c) => c.id === contactoId);
    if (!contacto) return { error: 'Contacto no encontrado.' };
    contacto.activo = false;
    return contacto;
  }

  return llamarTool<{ error: string } | ContactoPago>('desactivar_contacto_pago', { contactoId });
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
  >('cancelar_transferencia', { transferenciaId });

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

export interface HabitoFinanciero {
  id: string;
  habito: string;
  rachaDias: number;
}

const HABITOS_MOCK: HabitoFinanciero[] = [
  { id: 'habito-1', habito: 'Ahorro automático semanal', rachaDias: 6 },
  { id: 'habito-2', habito: 'Revisar gastos cada domingo', rachaDias: 3 },
];

export async function getHabitosFinancieros(userId: string): Promise<HabitoFinanciero[]> {
  if (USE_MOCK) return HABITOS_MOCK;

  const rows = await llamarTool<Array<{ id: string; habito: string; racha_dias: number }>>(
    'get_habitos_financieros',
    { userId },
  );

  return rows.map((h) => ({ id: h.id, habito: h.habito, rachaDias: h.racha_dias }));
}
