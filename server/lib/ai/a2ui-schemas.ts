import { z } from 'zod';

/**
 * Schemas del catálogo A2UI-lite (API JSON para el cliente client/).
 *
 * Cada schema es el "data schema" de un item del catálogo — define qué
 * puede/debe elegir el modelo (nunca datos crudos, esos vienen del MCP).
 */
export const schemaProgresoMeta = z.object({
  metaId: z
    .string()
    .optional()
    .describe(
      'Id de la meta a mostrar. Si no se especifica, se usa la meta con menor avance.',
    ),
  mensajeAgente: z
    .string()
    .describe('Mensaje breve (una línea) y motivador sobre este avance.'),
});

export const schemaSaldo = z.object({
  titulo: z
    .string()
    .describe('Qué representa el monto, ej. "Saldo disponible", "Total del mes".'),
  mensajeAgente: z.string().describe('Contexto breve, una línea.'),
});

export const schemaTransacciones = z.object({
  titulo: z
    .string()
    .describe('Encabezado de la lista, ej. "Últimos movimientos".'),
  limite: z
    .number()
    .int()
    .positive()
    .max(20)
    .optional()
    .describe('Cuántos movimientos mostrar. Si no se especifica, se usan 10.'),
  categoria: z
    .string()
    .optional()
    .describe(
      'Filtra solo movimientos de esta categoría, ej. "comida", "suscripciones". Si no se especifica, se muestran todas.',
    ),
  mensajeAgente: z.string().describe('Observación breve, una línea.'),
});

export const schemaComparativoGastos = z.object({
  titulo: z
    .string()
    .describe('Encabezado, ej. "Tus gastos de septiembre".'),
  mensajeAgente: z
    .string()
    .describe('Insight breve sobre el patrón de gasto, una línea.'),
});

/**
 * Schemas de tools de ESCRITURA (acciones, no solo mostrar). El modelo elige
 * ids por referencia (nunca inventa el valor detrás) y relaya valores que el
 * usuario pidió explícitamente (montos, fechas, descripciones) -- eso no es
 * "inventar un dato financiero" (constitution.md 4.2), es instrucción del
 * usuario. Todas comparten `mensajeAgente` (contrato 4.3).
 */

// --- Metas ---

export const schemaCrearMeta = z.object({
  titulo: z.string().describe('Nombre de la meta, ej. "Fondo de emergencia".'),
  montoObjetivo: z.number().positive().describe('Monto a alcanzar.'),
  montoInicial: z.number().min(0).optional().describe('Con cuánto arranca, si ya tenía algo ahorrado.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaAportarAMeta = z.object({
  metaId: z
    .string()
    .optional()
    .describe('Id de la meta a la que se aporta. Si no se especifica, se usa la meta con menor avance.'),
  monto: z.number().positive().describe('Cantidad a aportar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaArchivarMeta = z.object({
  metaId: z.string().describe('Id de la meta a archivar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Aportaciones programadas ---

export const schemaCrearAportacionProgramada = z.object({
  metaId: z.string().describe('Id de la meta a la que aplica el plan.'),
  monto: z.number().positive().describe('Monto de cada aportación.'),
  periodicidad: z.enum(['semanal', 'quincenal', 'mensual']),
  fechaInicio: z.string().describe('Fecha de la primera aportación (ISO 8601, ej. "2026-10-01").'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarAportacionProgramada = z.object({
  aportacionId: z.string().describe('Id del plan de aportación a cancelar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Banca personal ---

export const schemaCrearTransaccion = z.object({
  cuentaId: z
    .string()
    .optional()
    .describe('Id de la cuenta donde registrar el movimiento. Si no se especifica, se usa la primera cuenta del usuario.'),
  descripcion: z.string().describe('Descripción del movimiento, ej. "Café Starbucks".'),
  monto: z.number().describe('Monto con signo: negativo para gasto, positivo para ingreso.'),
  categoria: z.string().optional().describe('Categoría del movimiento, ej. "comida".'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Inversiones ---

export const schemaActualizarPerfilInversion = z.object({
  toleranciaRiesgo: z.enum(['conservador', 'moderado', 'agresivo']),
  horizonteAnios: z.number().int().positive(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaComprarPosicion = z.object({
  instrumentoId: z.string().describe('Id del instrumento a comprar (de una consulta previa al catálogo).'),
  cantidad: z.number().positive().describe('Cantidad de unidades a comprar.'),
  precioCompra: z.number().positive().describe('Precio por unidad al que se compra.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaVenderPosicion = z.object({
  posicionId: z.string().describe('Id de la posición a vender.'),
  cantidad: z.number().positive().optional().describe('Cantidad a vender. Si no se especifica, se vende toda la posición.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Crédito ---

export const schemaCrearCompraTarjeta = z.object({
  tarjetaId: z
    .string()
    .optional()
    .describe('Id de la tarjeta donde se hizo el cargo. Si no se especifica, se usa la primera tarjeta del usuario.'),
  descripcion: z.string().describe('Descripción de la compra.'),
  monto: z.number().positive(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaDiferirAMsi = z.object({
  compraId: z.string().describe('Id de la compra a diferir.'),
  mesesMsi: z.number().int().positive().describe('A cuántos meses se difiere, ej. 12.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearSolicitudCredito = z.object({
  tipo: z.enum(['personal', 'hipotecario', 'automotriz', 'tarjeta']),
  montoSolicitado: z.number().positive(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarSolicitudCredito = z.object({
  solicitudId: z.string().describe('Id de la solicitud a cancelar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Pagos ---

export const schemaCrearContactoPago = z.object({
  nombre: z.string().describe('Nombre del contacto.'),
  clabe: z.string().optional().describe('CLABE interbancaria, si se conoce.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaDesactivarContactoPago = z.object({
  contactoId: z.string().describe('Id del contacto a desactivar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearTransferencia = z.object({
  nombreContacto: z
    .string()
    .describe('Nombre (o parte del nombre) del contacto guardado al que se transfiere -- nunca un monto ni un id inventado.'),
  monto: z.number().positive(),
  concepto: z.string().optional(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarTransferencia = z.object({
  transferenciaId: z.string().describe('Id de la transferencia a cancelar (solo si sigue pendiente).'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Seguros ---

export const schemaCotizarPoliza = z.object({
  tipo: z.enum(['auto', 'vida', 'gmm', 'hogar']),
  cobertura: z.string().describe('Descripción de la cobertura, ej. "Cobertura amplia".'),
  primaMensual: z.number().positive(),
  vigenciaFin: z.string().describe('Fecha de fin de vigencia (ISO 8601, ej. "2027-06-30").'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaActivarPoliza = z.object({
  polizaId: z.string().describe('Id de la póliza cotizada a activar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarPoliza = z.object({
  polizaId: z.string().describe('Id de la póliza a cancelar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearSiniestro = z.object({
  polizaId: z.string().describe('Id de la póliza activa sobre la que se reporta.'),
  descripcion: z.string().describe('Descripción de lo ocurrido.'),
  montoReclamado: z.number().positive().optional(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Educación financiera ---

export const schemaCrearDiagnosticoFinanciero = z.object({
  puntaje: z.number().int().min(0).max(100),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearHabitoFinanciero = z.object({
  habito: z.string().describe('Descripción del hábito, ej. "Ahorro automático semanal".'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaActualizarRachaHabito = z.object({
  habitoId: z.string().describe('Id del hábito.'),
  dias: z.number().int().describe('Días a sumar a la racha (negativo para resetear).'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaDesactivarHabito = z.object({
  habitoId: z.string().describe('Id del hábito a desactivar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});
