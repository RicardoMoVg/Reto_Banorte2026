import { tool } from 'ai';
import {
  simularPlanPago,
  getPolizasSeguro,
  getPlanesPago,
  getMetasUsuario,
  getSaldoUsuario,
  getTransaccionesRecientes,
  crearMeta,
  aportarAMeta,
  archivarMeta,
  crearAportacionProgramada,
  cancelarAportacionProgramada,
  getCuentasUsuario,
  crearTransaccion,
  actualizarPerfilInversion,
  getInstrumentos,
  comprarPosicion,
  venderPosicion,
  getHistorialPrecio,
  getTarjetasCredito,
  crearCompraTarjeta,
  diferirAMsi,
  crearSolicitudCredito,
  cancelarSolicitudCredito,
  crearContactoPago,
  desactivarContactoPago,
  getContactosPago,
  crearTransferencia,
  cancelarTransferencia,
  cotizarPoliza,
  activarPoliza,
  cancelarPoliza,
  crearSiniestro,
  crearDiagnosticoFinanciero,
  crearHabitoFinanciero,
  actualizarRachaHabito,
  desactivarHabito,
} from '@/lib/mcp/mcp-client';
import {
  schemaProgresoMeta,
  schemaSaldo,
  schemaTransacciones,
  schemaComparativoGastos,
  schemaTarjetaAccion,
  schemaGrafica,
  schemaPropuestaAhorro,
  schemaConfirmarAccion,
  schemaCrearMeta,
  schemaAportarAMeta,
  schemaArchivarMeta,
  schemaCrearAportacionProgramada,
  schemaCancelarAportacionProgramada,
  schemaCrearTransaccion,
  schemaMostrarInstrumentos,
  schemaActualizarPerfilInversion,
  schemaComprarPosicion,
  schemaVenderPosicion,
  schemaHistorialPrecio,
  schemaCrearCompraTarjeta,
  schemaDiferirAMsi,
  schemaCrearSolicitudCredito,
  schemaCancelarSolicitudCredito,
  schemaCrearContactoPago,
  schemaDesactivarContactoPago,
  schemaCrearTransferencia,
  schemaCancelarTransferencia,
  schemaCotizarPoliza,
  schemaActivarPoliza,
  schemaCancelarPoliza,
  schemaCrearSiniestro,
  schemaCrearDiagnosticoFinanciero,
  schemaCrearHabitoFinanciero,
  schemaActualizarRachaHabito,
  schemaDesactivarHabito,
} from './a2ui-schemas';

/**
 * Tope de transacciones por llamada. Lo impone el schema Zod de
 * `get_transacciones` en mcp-server/: pedir mas hace que el MCP rechace la
 * llamada entera. Con mocks no se notaba porque los mocks no validan.
 */
const MAX_TRANSACCIONES = 50;

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/**
 * Renglones del calendario de un plan. Se muestran hasta 6 periodos: con
 * plazos largos se reparten parejo en vez de listar 24 meses, que no cabe
 * en una tarjeta de chat.
 */
function calendarioDe(actual: number, aportacion: number, objetivo: number, periodos: number) {
  const MAXIMO = 6;
  const indices =
    periodos <= MAXIMO
      ? Array.from({ length: periodos }, (_, i) => i + 1)
      : Array.from({ length: MAXIMO }, (_, i) => Math.round(((i + 1) * periodos) / MAXIMO));

  return Array.from(new Set(indices)).map((n) => ({
    periodo: `Mes ${n}`,
    // El tope evita mostrar más que la meta: la aportación se redondea
    // hacia arriba, así que el último periodo se pasaría por unos pesos.
    acumulado: Math.min(objetivo, Math.round(actual + aportacion * n)),
  }));
}

/**
 * Tabla de datos referenciables por `idDato` para la tool genérica
 * `confirmarAccion` (constitution.md 4.4): el modelo elige QUÉ mostrar por
 * referencia, y el valor lo inyecta este código. Una referencia que no
 * exista se descarta — nunca se rellena con un número inventado.
 */
async function datosReferenciables(userId: string): Promise<Record<string, number>> {
  const [saldo, metas] = await Promise.all([getSaldoUsuario(userId), getMetasUsuario(userId)]);

  const tabla: Record<string, number> = { saldo };

  metas.forEach((m, i) => {
    const faltante = Math.max(0, m.montoObjetivo - m.montoActual);
    tabla[`meta:${m.id}.actual`] = m.montoActual;
    tabla[`meta:${m.id}.objetivo`] = m.montoObjetivo;
    tabla[`meta:${m.id}.faltante`] = faltante;

    // Alias sin id para la meta de menor avance: getMetasUsuario ya las
    // regresa ordenadas por porcentaje ascendente.
    if (i === 0) {
      tabla['meta.actual'] = m.montoActual;
      tabla['meta.objetivo'] = m.montoObjetivo;
      tabla['meta.faltante'] = faltante;
    }
  });

  return tabla;
}

/**
 * Catálogo de tools del A2UI-lite (API JSON, /app/api/agent/route.ts).
 *
 * Cada tool usa la API plana de "ai" y su `execute` regresa JSON, nunca
 * JSX — el cliente (client/) decide cómo pintarlo con su propio catálogo
 * de componentes nativos. Llama al MCP real: el modelo nunca inventa
 * datos, solo elige qué mostrar y redacta el mensaje de contexto.
 */
export function buildA2uiTools(userId: string) {
  return {
    mostrarProgresoMeta: tool({
      description:
        'Muestra visualmente el progreso de una meta de ahorro o hábito ' +
        'financiero del usuario. Úsala siempre que pregunte por su avance, ' +
        'en vez de describir el porcentaje en texto.',
      parameters: schemaProgresoMeta,
      execute: async ({ metaId, agregarAInicio, mensajeAgente }) => {
        const metas = await getMetasUsuario(userId);
        // Si el modelo manda un metaId que no existe (a veces inventa un id
        // "plausible" en vez de dejarlo vacío), no truena: cae a la meta con
        // menor avance, igual que cuando no se especifica ninguno.
        const meta = (metaId && metas.find((m) => m.id === metaId)) || metas[0];

        if (!meta) {
          return { error: 'El usuario no tiene metas registradas.' };
        }

        return {
          tipo: 'RastreadorMetas' as const,
          props: {
            titulo: meta.titulo,
            porcentaje: meta.porcentaje,
            mensajeAgente,
            agregarAInicio,
          },
        };
      },
    }),

    mostrarSaldo: tool({
      description:
        'Muestra un monto financiero destacado: saldo disponible, total ' +
        'gastado en el mes, dinero ahorrado, etc.',
      parameters: schemaSaldo,
      execute: async ({ titulo, agregarAInicio, mensajeAgente }) => {
        const saldo = await getSaldoUsuario(userId);

        return {
          tipo: 'TarjetaSaldo' as const,
          props: {
            titulo,
            monto: saldo,
            mensajeAgente,
            agregarAInicio,
          },
        };
      },
    }),

    mostrarTransacciones: tool({
      description:
        'Muestra una lista de movimientos recientes del usuario. Úsala ' +
        'cuando pregunte en qué gastó, sus últimos cargos o sus ingresos.',
      parameters: schemaTransacciones,
      execute: async ({ titulo, limite, categoria, agregarAInicio, mensajeAgente }) => {
        const transacciones = await getTransaccionesRecientes(userId, {
          limite: limite ?? 10,
          categoria,
        });

        return {
          tipo: 'ListaTransacciones' as const,
          props: {
            titulo,
            transacciones: transacciones.map((t) => ({
              descripcion: t.descripcion,
              monto: t.monto,
              categoria: t.categoria,
            })),
            mensajeAgente,
            agregarAInicio,
          },
        };
      },
    }),

    mostrarComparativoGastos: tool({
      description:
        'Muestra una gráfica de barras comparando cuánto gastó el usuario ' +
        'por categoría. Úsala cuando pregunte en qué se le va el dinero o ' +
        'pida comparar categorías.',
      parameters: schemaComparativoGastos,
      execute: async ({ titulo, agregarAInicio, mensajeAgente }) => {
        // No existe una tool de MCP para "gasto por categoría" — se
        // agrega aquí en JS a partir de las transacciones, en vez de
        // agregar una tabla/query nueva en mcp-server/ (ver plan, Paso 3c).
        const transacciones = await getTransaccionesRecientes(userId, { limite: MAX_TRANSACCIONES });

        const porCategoria = new Map<string, number>();
        for (const t of transacciones) {
          if (t.monto >= 0) continue; // solo gastos, no ingresos
          const categoria = t.categoria || 'otros';
          porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + Math.abs(t.monto));
        }

        const categorias = Array.from(porCategoria.entries())
          .map(([nombre, monto]) => ({ nombre, monto }))
          .sort((a, b) => b.monto - a.monto)
          .slice(0, 6);

        return {
          tipo: 'ComparativoGastos' as const,
          props: { titulo, categorias, mensajeAgente, agregarAInicio },
        };
      },
    }),

    /* ---------------------------------------------------------------- *
     * Bloques de ACCIÓN. El usuario los acepta o rechaza y el cliente le
     * avisa al agente en el siguiente turno ("Acepto <etiqueta>."). Ver
     * client/components/chat/tipos.ts.
     * ---------------------------------------------------------------- */

    mostrarGrafica: tool({
      description:
        'Muestra los gastos del usuario por categoria en la FORMA de grafico ' +
        'que elijas: pastel, dona, barras verticales, barras horizontales o ' +
        'linea. Usala cuando el usuario pida explicitamente un tipo de ' +
        'grafica ("una grafica de pie", "en barras") o cuando una forma ' +
        'distinta a las barras explique mejor el dato. Respeta SIEMPRE el ' +
        'tipo que pida el usuario.',
      parameters: schemaGrafica,
      execute: async ({ componente, titulo, agregarAInicio, mensajeAgente }) => {
        const transacciones = await getTransaccionesRecientes(userId, {
          limite: MAX_TRANSACCIONES,
        });

        const porCategoria = new Map<string, number>();
        for (const t of transacciones) {
          if (t.monto >= 0) continue; // solo gastos, no ingresos
          const categoria = t.categoria || 'otros';
          porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + Math.abs(t.monto));
        }

        const categorias = Array.from(porCategoria.entries())
          .map(([nombre, monto]) => ({ nombre, monto }))
          .sort((a, b) => b.monto - a.monto)
          .slice(0, 6);

        if (categorias.length === 0) {
          return { error: 'No hay gastos registrados para graficar.' };
        }

        // `componente` es el nombre en el catalogo del cliente: el modelo
        // eligio la forma del grafico, el codigo puso los datos.
        return {
          tipo: componente,
          props: { titulo, categorias, mensajeAgente, agregarAInicio },
        };
      },
    }),

    armarTarjetaAccion: tool({
      description:
        'Arma una tarjeta de accion a la medida, eligiendo de que piezas se ' +
        'compone (una cifra destacada, un resumen, una tabla, opciones a ' +
        'elegir, una nota). Es la tool preferida siempre que el usuario deba ' +
        'ESCOGER entre alternativas. Casos que cubre hoy, con el valor de ' +
        '`fuente` que le toca a la pieza "opciones": ' +
        'reestructurar el saldo de la tarjeta a plazos -> "planes-pago"; ' +
        'invertir o comparar rendimientos -> "instrumentos"; ' +
        'elegir una meta de ahorro -> "metas"; ' +
        'contratar o revisar un seguro -> "polizas"; ' +
        'fijar un limite de gasto mensual para una categoria -> ' +
        '"limites-presupuesto" (manda `parametro` con la categoria, ej. "comida"); ' +
        'cuanto pagar de la tarjeta o como evitar intereses -> "pagos-tarjeta".',
      parameters: schemaTarjetaAccion,
      execute: async ({
        intencion,
        titulo,
        contenido,
        textoAccion,
        resultado,
        etiqueta,
        mensajeAgente,
      }) => {
        const tabla = await datosReferenciables(userId);

        /** Expande una `fuente` a filas reales del MCP. */
        async function filasDe(fuente: string, parametro?: string) {
          if (fuente === 'polizas') {
            const polizas = await getPolizasSeguro(userId);
            return polizas.map((p) => ({
              id: p.id,
              tituloOpcion: p.cobertura,
              subtitulo: `Seguro de ${p.tipo} · ${p.estatus}`,
              valorDestacado: `${formatoMXN.format(p.primaMensual)}/mes`,
            }));
          }

          if (fuente === 'limites-presupuesto') {
            // El promedio sale del historial real; los porcentajes son
            // política de producto, no un dato del banco -- por eso el
            // subtítulo los declara en vez de presentarlos como cifra dada.
            const categoria = (parametro ?? '').trim().toLowerCase();
            if (!categoria) return [];

            const transacciones = await getTransaccionesRecientes(userId, {
              limite: MAX_TRANSACCIONES,
              categoria,
            });
            const gastos = transacciones.filter((t) => t.monto < 0);
            if (gastos.length === 0) return [];

            const meses = new Set(gastos.map((t) => t.fecha.slice(0, 7))).size || 1;
            const promedio = gastos.reduce((acc, t) => acc + Math.abs(t.monto), 0) / meses;

            return [
              { id: 'estricto', factor: 0.8, titulo: 'Estricto', nota: '20% abajo de tu promedio' },
              { id: 'recomendado', factor: 0.95, titulo: 'Recomendado', nota: '5% abajo de tu promedio' },
              { id: 'holgado', factor: 1.15, titulo: 'Holgado', nota: 'Margen para imprevistos' },
            ].map((o) => ({
              id: o.id,
              tituloOpcion: o.titulo,
              subtitulo: o.nota,
              valorDestacado: `${formatoMXN.format(Math.round(promedio * o.factor))}/mes`,
            }));
          }

          if (fuente === 'pagos-tarjeta') {
            const [tarjeta] = await getTarjetasCredito(userId);
            if (!tarjeta || tarjeta.saldoActual <= 0) return [];

            // Pagar todo es la única opción sin intereses; el costo de las
            // demás lo calcula el simulador del MCP con la tasa real de la
            // tarjeta, no una regla inventada aquí.
            const diferidos = await Promise.all(
              [3, 6].map((plazo) => simularPlanPago(tarjeta.saldoActual, plazo, tarjeta.tasaAnual)),
            );

            return [
              {
                id: 'total',
                tituloOpcion: 'Pagar todo este mes',
                subtitulo: 'La única opción que no genera intereses',
                valorDestacado: formatoMXN.format(tarjeta.saldoActual),
              },
              ...diferidos.map((d) => ({
                id: `diferido-${d.plazoMeses}`,
                tituloOpcion: `Diferir a ${d.plazoMeses} meses`,
                subtitulo: `Tasa ${d.tasaAnual}% anual`,
                valorDestacado: `${formatoMXN.format(Math.round(d.pagoMensual))}/mes`,
                advertencia: `Pagarías ${formatoMXN.format(Math.round(d.totalIntereses))} de intereses.`,
              })),
            ];
          }

          if (fuente === 'planes-pago') {
            const [tarjeta] = await getTarjetasCredito(userId);
            if (!tarjeta) return [];
            const planes = await getPlanesPago(tarjeta.id);
            return planes.map((p) => ({
              id: p.id,
              tituloOpcion: `${p.plazoMeses} meses`,
              subtitulo: `CAT ${p.cat}%`,
              valorDestacado: `${formatoMXN.format(p.pagoMensual)}/mes`,
            }));
          }

          if (fuente === 'instrumentos') {
            const instrumentos = await getInstrumentos();
            return instrumentos.map((i) => ({
              id: i.id,
              tituloOpcion: i.nombre,
              subtitulo: `Riesgo ${i.riesgo}`,
              valorDestacado: `${i.rendimientoAnualEstimado}% anual`,
            }));
          }

          const metas = await getMetasUsuario(userId);
          return metas.map((m) => ({
            id: m.id,
            tituloOpcion: m.titulo,
            subtitulo: `${m.porcentaje}% de avance`,
            valorDestacado: formatoMXN.format(m.montoObjetivo - m.montoActual),
          }));
        }

        // Cada pieza se reconstruye con datos reales. Una referencia que no
        // existe se descarta en vez de rellenarse con un número inventado
        // (constitution.md 4.2) -- por eso el filter(Boolean) del final.
        const piezas = await Promise.all(
          contenido.map(async (c) => {
            if (c.elemento === 'destacado') {
              const valor = c.idDato ? tabla[c.idDato] : undefined;
              if (typeof valor !== 'number') return null;
              return {
                elemento: 'destacado' as const,
                etiqueta: c.etiqueta ?? 'Monto',
                valor: formatoMXN.format(valor),
              };
            }

            if (c.elemento === 'resumen') {
              const filas = (c.campos ?? [])
                .filter((campo) => typeof tabla[campo.idDato] === 'number')
                .map((campo) => ({
                  etiqueta: campo.etiqueta,
                  valor: formatoMXN.format(tabla[campo.idDato]),
                }));
              return filas.length > 0 ? { elemento: 'resumen' as const, filas } : null;
            }

            if (c.elemento === 'opciones') {
              const opciones = await filasDe(c.fuente ?? 'metas', c.parametro);
              return opciones.length > 0 ? { elemento: 'opciones' as const, opciones } : null;
            }

            if (c.elemento === 'tabla') {
              const filas = await filasDe(c.fuente ?? 'metas', c.parametro);
              if (filas.length === 0) return null;
              return {
                elemento: 'tabla' as const,
                columnas: ['Opción', 'Detalle', 'Monto'],
                renglones: filas.map((f) => ({
                  celdas: [f.tituloOpcion, f.subtitulo, f.valorDestacado],
                })),
              };
            }

            return c.texto
              ? { elemento: 'nota' as const, texto: c.texto, tono: c.tono ?? 'info' }
              : null;
          }),
        );

        const definitivas = piezas.filter((p) => p !== null);

        if (definitivas.length === 0) {
          return {
            error:
              'No hay datos para ninguna de las piezas pedidas, así que la tarjeta quedaría vacía.',
          };
        }

        return {
          tipo: 'TarjetaAccion' as const,
          props: {
            idAccion: `tarjeta-${Date.now()}`,
            etiqueta,
            intencion,
            titulo,
            contenido: definitivas,
            textoAccion,
            resultado,
            mensajeAgente,
          },
        };
      },
    }),

    proponerPlanAhorro: tool({
      description:
        'Propone un plan concreto para alcanzar una meta de ahorro: cuánto ' +
        'apartar al mes y en cuántos meses, con una tabla del avance y un ' +
        'botón para aceptarlo. Úsala cuando el usuario pida un plan, ' +
        'pregunte cómo llegar a una meta, o cuánto debería ahorrar.',
      parameters: schemaPropuestaAhorro,
      execute: async ({ intencion, metaId, plazoMeses, titulo, etiqueta, mensajeAgente }) => {
        const metas = await getMetasUsuario(userId);
        const meta = (metaId && metas.find((m) => m.id === metaId)) || metas[0];

        if (!meta) {
          return { error: 'El usuario no tiene metas registradas.' };
        }

        const faltante = meta.montoObjetivo - meta.montoActual;
        if (faltante <= 0) {
          return {
            error: `La meta "${meta.titulo}" ya está cumplida, no hace falta un plan.`,
          };
        }

        // La aportación sale de la división, no del modelo.
        const aportacion = Math.ceil(faltante / plazoMeses);

        return {
          tipo: 'PropuestaAhorro' as const,
          props: {
            idAccion: `plan-${meta.id}-${Date.now()}`,
            etiqueta,
            intencion,
            titulo,
            meta: meta.titulo,
            aportacion,
            periodos: plazoMeses,
            objetivo: meta.montoObjetivo,
            actual: meta.montoActual,
            calendario: calendarioDe(meta.montoActual, aportacion, meta.montoObjetivo, plazoMeses),
            mensajeAgente,
          },
        };
      },
    }),

    // ============================================================
    // Tools de ESCRITURA -- el modelo ya puede ejecutar acciones, no solo
    // mostrar datos. Cada una llama a mcp-client.ts (nunca inventa el
    // resultado) y regresa Confirmacion salvo que exista un componente más
    // específico (metas reusan RastreadorMetas, crearTransaccion reusa
    // TarjetaSaldo). Los errores de negocio se regresan como `{error}` sin
    // `tipo` -- route.ts ya los convierte en texto plano.
    // ============================================================

    crearMeta: tool({
      description: 'Crea una nueva meta de ahorro para el usuario. Úsala cuando pida armar una meta nueva.',
      parameters: schemaCrearMeta,
      execute: async ({ titulo, montoObjetivo, montoInicial, mensajeAgente }) => {
        const meta = await crearMeta(userId, titulo, montoObjetivo, montoInicial);
        return {
          tipo: 'RastreadorMetas' as const,
          props: { titulo: meta.titulo, porcentaje: meta.porcentaje, mensajeAgente },
        };
      },
    }),

    aportarAMeta: tool({
      description: 'Aporta dinero a una meta de ahorro activa del usuario. Úsala cuando pida abonar/meter dinero a una meta.',
      parameters: schemaAportarAMeta,
      execute: async ({ metaId, monto, mensajeAgente }) => {
        const metas = await getMetasUsuario(userId);
        // A diferencia de mostrarProgresoMeta (solo lectura), aquí un
        // metaId que no existe SÍ debe truncar en error -- es dinero
        // moviéndose de verdad, no se vale adivinar en silencio a cuál
        // meta cayó. Mismo criterio si no manda metaId pero hay más de
        // una meta: no se adivina, se le pregunta al usuario cuál.
        let meta;
        if (metaId) {
          meta = metas.find((m) => m.id === metaId);
          if (!meta) return { error: `No se encontró una meta activa con id "${metaId}".` };
        } else if (metas.length > 1) {
          return {
            error: `El usuario tiene varias metas: ${metas.map((m) => m.titulo).join(', ')}. Pregúntale a cuál se refiere.`,
          };
        } else {
          meta = metas[0];
          if (!meta) return { error: 'El usuario no tiene metas registradas.' };
        }

        const resultado = await aportarAMeta(userId, meta.id, monto);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'RastreadorMetas' as const,
          props: { titulo: resultado.titulo, porcentaje: resultado.porcentaje, mensajeAgente },
        };
      },
    }),

    confirmarAccion: tool({
      description:
        'Pide confirmación al usuario antes de configurar algo en la app ' +
        '(activar una alerta, apartar dinero para una meta, cambiar un ' +
        'límite). Muestra un resumen y los botones de aceptar/rechazar. ' +
        'Úsala en vez de preguntar "¿quieres que lo haga?" en texto.',
      parameters: schemaConfirmarAccion,
      execute: async ({
        intencion,
        titulo,
        campos,
        textoAceptar,
        resultado,
        advertencia,
        etiqueta,
        mensajeAgente,
      }) => {
        const tabla = await datosReferenciables(userId);

        // Una referencia inexistente se cae de la lista en vez de mostrarse
        // vacía o con un número inventado (constitution.md 4.2).
        const resumen = campos
          .filter((c) => typeof tabla[c.idDato] === 'number')
          .map((c) => ({ etiqueta: c.etiqueta, valor: formatoMXN.format(tabla[c.idDato]) }));

        if (campos.length > 0 && resumen.length === 0) {
          return {
            error:
              'Ninguna de las referencias pedidas existe para este usuario, ' +
              'así que no se puede armar el resumen de la acción.',
          };
        }

        return {
          tipo: 'ConfirmarAccion' as const,
          props: {
            idAccion: `accion-${Date.now()}`,
            etiqueta,
            intencion,
            titulo,
            resumen,
            textoAceptar,
            resultado,
            advertencia,
            mensajeAgente,
          },
        };
      },
    }),

    archivarMeta: tool({
      description: 'Archiva una meta del usuario (deja de contar, no se borra su historial). Solo si lo pide explícitamente.',
      parameters: schemaArchivarMeta,
      execute: async ({ metaId, mensajeAgente }) => {
        const resultado = await archivarMeta(userId, metaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Meta archivada', mensaje: resultado.titulo, exito: true, mensajeAgente },
        };
      },
    }),

    crearAportacionProgramada: tool({
      description:
        'Crea un plan de aportación periódica hacia una meta (ej. "$634/mes por 6 meses"). No ejecuta ' +
        'aportaciones, solo guarda el compromiso.',
      parameters: schemaCrearAportacionProgramada,
      execute: async ({ metaId, monto, periodicidad, fechaInicio, mensajeAgente }) => {
        const resultado = await crearAportacionProgramada(userId, metaId, monto, periodicidad, fechaInicio);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Plan de aportación creado',
            mensaje: `$${monto} ${periodicidad}, a partir de ${fechaInicio}.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    cancelarAportacionProgramada: tool({
      description: 'Cancela un plan de aportación programada activo.',
      parameters: schemaCancelarAportacionProgramada,
      execute: async ({ aportacionId, mensajeAgente }) => {
        const resultado = await cancelarAportacionProgramada(userId, aportacionId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Plan cancelado', mensaje: 'Se canceló el plan de aportación.', exito: true, mensajeAgente },
        };
      },
    }),

    crearTransaccion: tool({
      description: 'Registra un movimiento (gasto o ingreso) en una cuenta del usuario. Úsala cuando pida registrar/anotar un gasto o ingreso.',
      parameters: schemaCrearTransaccion,
      execute: async ({ cuentaId, descripcion, monto, categoria, mensajeAgente }) => {
        const cuentas = await getCuentasUsuario(userId);
        let cuenta;
        if (cuentaId) {
          cuenta = cuentas.find((c) => c.id === cuentaId);
          if (!cuenta) return { error: `No se encontró una cuenta con id "${cuentaId}".` };
        } else if (cuentas.length > 1) {
          return {
            error: `El usuario tiene varias cuentas: ${cuentas.map((c) => c.alias).join(', ')}. Pregúntale en cuál.`,
          };
        } else {
          cuenta = cuentas[0];
          if (!cuenta) return { error: 'El usuario no tiene cuentas registradas.' };
        }

        const resultado = await crearTransaccion(userId, cuenta.id, descripcion, monto, categoria);
        if ('error' in resultado) return { error: resultado.error };

        const saldo = await getSaldoUsuario(userId);
        return {
          tipo: 'TarjetaSaldo' as const,
          props: { titulo: 'Saldo disponible', monto: saldo, mensajeAgente },
        };
      },
    }),

    mostrarInstrumentos: tool({
      description:
        'Muestra el catálogo de instrumentos de inversión disponibles (no solo los que ya tiene el ' +
        'usuario), con su precio actual. Úsala cuando pregunte qué opciones hay para invertir, antes de ' +
        'comprar/vender algo.',
      parameters: schemaMostrarInstrumentos,
      execute: async ({ tipo, riesgo, titulo, mensajeAgente }) => {
        const instrumentos = await getInstrumentos({ tipo, riesgo });

        return {
          tipo: 'GraficoBarras_H' as const,
          props: {
            titulo,
            categorias: instrumentos.map((i) => ({ nombre: i.nombre, monto: i.precioActual })),
            mensajeAgente,
          },
        };
      },
    }),

    actualizarPerfilInversion: tool({
      description: 'Actualiza el perfil de inversión del usuario (tolerancia al riesgo y horizonte).',
      parameters: schemaActualizarPerfilInversion,
      execute: async ({ toleranciaRiesgo, horizonteAnios, mensajeAgente }) => {
        await actualizarPerfilInversion(userId, toleranciaRiesgo, horizonteAnios);

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Perfil actualizado',
            mensaje: `Tolerancia ${toleranciaRiesgo}, horizonte ${horizonteAnios} años.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    comprarPosicion: tool({
      description: 'Compra un instrumento de inversión para el usuario (de un id ya consultado en el catálogo).',
      parameters: schemaComprarPosicion,
      execute: async ({ instrumentoId, cantidad, precioCompra, mensajeAgente }) => {
        await comprarPosicion(userId, instrumentoId, cantidad, precioCompra);

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Compra realizada',
            mensaje: `${cantidad} unidades a $${precioCompra}.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    venderPosicion: tool({
      description: 'Vende una posición de inversión del usuario, total o parcialmente.',
      parameters: schemaVenderPosicion,
      execute: async ({ posicionId, cantidad, mensajeAgente }) => {
        const resultado = await venderPosicion(userId, posicionId, cantidad);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Venta realizada',
            mensaje: resultado.activa ? 'Venta parcial registrada.' : 'Posición vendida por completo.',
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    mostrarHistorialPrecio: tool({
      description:
        'Muestra una gráfica de cómo se ha movido el precio de un instrumento (ej. un dólar, un fondo) en el ' +
        'tiempo. Úsala cuando pregunte cómo ha ido/se ha movido/ha subido o bajado un instrumento.',
      parameters: schemaHistorialPrecio,
      execute: async ({ instrumentoId, horasHaciaAtras, titulo, mensajeAgente }) => {
        const ahora = new Date();
        const desde = new Date(ahora.getTime() - (horasHaciaAtras ?? 24) * 60 * 60 * 1000);

        const resultado = await getHistorialPrecio(instrumentoId, desde.toISOString(), ahora.toISOString(), 20);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'GraphSpline' as const,
          props: {
            titulo,
            categorias: resultado.map((p) => ({
              nombre: new Date(p.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
              monto: p.precio,
            })),
            mensajeAgente,
          },
        };
      },
    }),

    crearCompraTarjeta: tool({
      description: 'Registra un cargo (compra) en una tarjeta de crédito del usuario.',
      parameters: schemaCrearCompraTarjeta,
      execute: async ({ tarjetaId, descripcion, monto, mensajeAgente }) => {
        const tarjetas = await getTarjetasCredito(userId);
        let tarjeta;
        if (tarjetaId) {
          tarjeta = tarjetas.find((t) => t.id === tarjetaId);
          if (!tarjeta) return { error: `No se encontró una tarjeta con id "${tarjetaId}".` };
        } else if (tarjetas.length > 1) {
          return {
            error: `El usuario tiene varias tarjetas: ${tarjetas.map((t) => t.alias).join(', ')}. Pregúntale en cuál.`,
          };
        } else {
          tarjeta = tarjetas[0];
          if (!tarjeta) return { error: 'El usuario no tiene tarjetas de crédito registradas.' };
        }

        const resultado = await crearCompraTarjeta(userId, tarjeta.id, descripcion, monto);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Compra registrada', mensaje: `${descripcion}: $${monto}.`, exito: true, mensajeAgente },
        };
      },
    }),

    diferirAMsi: tool({
      description: 'Difiere una compra ya hecha en tarjeta de crédito a meses sin intereses (MSI).',
      parameters: schemaDiferirAMsi,
      execute: async ({ compraId, mesesMsi, mensajeAgente }) => {
        const resultado = await diferirAMsi(userId, compraId, mesesMsi);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Compra diferida',
            mensaje: `Diferida a ${mesesMsi} meses sin intereses.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    crearSolicitudCredito: tool({
      description: 'Crea una solicitud de crédito para el usuario.',
      parameters: schemaCrearSolicitudCredito,
      execute: async ({ tipo, montoSolicitado, mensajeAgente }) => {
        await crearSolicitudCredito(userId, tipo, montoSolicitado);

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Solicitud enviada',
            mensaje: `Crédito ${tipo} por $${montoSolicitado}.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    cancelarSolicitudCredito: tool({
      description: 'Cancela una solicitud de crédito pendiente.',
      parameters: schemaCancelarSolicitudCredito,
      execute: async ({ solicitudId, mensajeAgente }) => {
        const resultado = await cancelarSolicitudCredito(userId, solicitudId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Solicitud cancelada', mensaje: 'Se canceló la solicitud.', exito: true, mensajeAgente },
        };
      },
    }),

    crearContactoPago: tool({
      description: 'Guarda un nuevo contacto de pago para el usuario.',
      parameters: schemaCrearContactoPago,
      execute: async ({ nombre, clabe, mensajeAgente }) => {
        await crearContactoPago(userId, nombre, clabe);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Contacto guardado', mensaje: nombre, exito: true, mensajeAgente },
        };
      },
    }),

    desactivarContactoPago: tool({
      description: 'Desactiva un contacto de pago guardado.',
      parameters: schemaDesactivarContactoPago,
      execute: async ({ contactoId, mensajeAgente }) => {
        const resultado = await desactivarContactoPago(userId, contactoId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Contacto desactivado', mensaje: resultado.nombre, exito: true, mensajeAgente },
        };
      },
    }),

    proponerTransferencia: tool({
      description:
        'Prepara una transferencia a un contacto guardado y se la muestra al usuario para que ' +
        'la confirme. Usala cuando pida transferirle/mandarle dinero a alguien por nombre. ' +
        'NO mueve dinero: solo propone. El movimiento ocurre cuando el usuario toca el boton ' +
        'de confirmar en la tarjeta.',
      parameters: schemaCrearTransferencia,
      execute: async ({ nombreContacto, monto, concepto, mensajeAgente }) => {
        const contactos = await getContactosPago(userId, { nombre: nombreContacto });

        if (contactos.length === 0) {
          return { error: `No se encontro ningun contacto guardado que coincida con "${nombreContacto}".` };
        }
        if (contactos.length > 1) {
          return {
            error: `Hay mas de un contacto que coincide con "${nombreContacto}": ${contactos
              .map((c) => c.nombre)
              .join(', ')}. Pide que aclare a cual.`,
          };
        }

        const contacto = contactos[0];
        const resumen = [{ etiqueta: `Para ${contacto.nombre}`, valor: formatoMXN.format(monto) }];

        return {
          tipo: 'ConfirmarAccion' as const,
          props: {
            idAccion: `transferencia-${contacto.id}-${Date.now()}`,
            etiqueta: `la transferencia a ${contacto.nombre}`,
            intencion: 'alerta' as const,
            titulo: `Transferir a ${contacto.nombre}`,
            resumen,
            textoAceptar: 'Confirmar transferencia',
            resultado: `Transferencia enviada a ${contacto.nombre}.`,
            advertencia: concepto
              ? `Concepto: ${concepto}. Una transferencia enviada no se puede deshacer.`
              : 'Una transferencia enviada no se puede deshacer.',
            mensajeAgente,
            /**
             * La receta de ejecucion. El cliente la regresa TAL CUAL al
             * confirmar y el servidor la corre sin volver a preguntarle al
             * modelo: si el modelo tuviera que elegir la tool otra vez,
             * podria equivocarse de contacto o de monto en el segundo
             * intento. Aqui el monto ya esta fijado y validado.
             */
            ejecucion: {
              tool: 'ejecutarTransferencia',
              args: { contactoId: contacto.id, monto, concepto },
            },
          },
        };
      },
    }),

    cancelarTransferencia: tool({
      description: 'Cancela una transferencia que sigue pendiente.',
      parameters: schemaCancelarTransferencia,
      execute: async ({ transferenciaId, mensajeAgente }) => {
        const resultado = await cancelarTransferencia(userId, transferenciaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Transferencia cancelada', mensaje: 'Se canceló la transferencia.', exito: true, mensajeAgente },
        };
      },
    }),

    cotizarPoliza: tool({
      description: 'Genera una cotización de seguro para el usuario.',
      parameters: schemaCotizarPoliza,
      execute: async ({ tipo, cobertura, primaMensual, vigenciaFin, mensajeAgente }) => {
        await cotizarPoliza(userId, tipo, cobertura, primaMensual, vigenciaFin);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Cotización generada', mensaje: `${tipo}: $${primaMensual}/mes.`, exito: true, mensajeAgente },
        };
      },
    }),

    activarPoliza: tool({
      description: 'Activa una póliza de seguro que estaba cotizada.',
      parameters: schemaActivarPoliza,
      execute: async ({ polizaId, mensajeAgente }) => {
        const resultado = await activarPoliza(userId, polizaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Póliza activada', mensaje: resultado.cobertura, exito: true, mensajeAgente },
        };
      },
    }),

    cancelarPoliza: tool({
      description: 'Cancela una póliza de seguro (cotizada o activa).',
      parameters: schemaCancelarPoliza,
      execute: async ({ polizaId, mensajeAgente }) => {
        const resultado = await cancelarPoliza(userId, polizaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Póliza cancelada', mensaje: resultado.cobertura, exito: true, mensajeAgente },
        };
      },
    }),

    crearSiniestro: tool({
      description: 'Reporta un siniestro/reclamo sobre una póliza de seguro activa.',
      parameters: schemaCrearSiniestro,
      execute: async ({ polizaId, descripcion, montoReclamado, mensajeAgente }) => {
        const resultado = await crearSiniestro(userId, polizaId, descripcion, montoReclamado);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Siniestro reportado', mensaje: descripcion, exito: true, mensajeAgente },
        };
      },
    }),

    crearDiagnosticoFinanciero: tool({
      description: 'Registra un nuevo diagnóstico financiero (puntaje 0-100) para el usuario.',
      parameters: schemaCrearDiagnosticoFinanciero,
      execute: async ({ puntaje, mensajeAgente }) => {
        await crearDiagnosticoFinanciero(userId, puntaje);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Diagnóstico registrado', mensaje: `Puntaje: ${puntaje}/100.`, exito: true, mensajeAgente },
        };
      },
    }),

    crearHabitoFinanciero: tool({
      description: 'Registra un nuevo hábito financiero que el usuario quiere seguir.',
      parameters: schemaCrearHabitoFinanciero,
      execute: async ({ habito, mensajeAgente }) => {
        await crearHabitoFinanciero(userId, habito);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Hábito creado', mensaje: habito, exito: true, mensajeAgente },
        };
      },
    }),

    actualizarRachaHabito: tool({
      description: 'Suma o resetea los días de racha de un hábito financiero activo.',
      parameters: schemaActualizarRachaHabito,
      execute: async ({ habitoId, dias, mensajeAgente }) => {
        const resultado = await actualizarRachaHabito(userId, habitoId, dias);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Racha actualizada',
            mensaje: `${resultado.habito}: ${resultado.rachaDias} días.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    desactivarHabito: tool({
      description: 'Desactiva un hábito financiero.',
      parameters: schemaDesactivarHabito,
      execute: async ({ habitoId, mensajeAgente }) => {
        const resultado = await desactivarHabito(userId, habitoId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Hábito desactivado', mensaje: resultado.habito, exito: true, mensajeAgente },
        };
      },
    }),
  };
}
