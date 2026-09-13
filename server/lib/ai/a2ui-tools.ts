import { tool } from 'ai';
import {
  getInstrumentos,
  getMetasUsuario,
  getPlanesPago,
  getPolizasSeguro,
  getSaldoUsuario,
  getTarjetasCredito,
  getTransaccionesRecientes,
  simularPlanPago,
} from '@/lib/mcp/mcp-client';
import {
  schemaProgresoMeta,
  schemaSaldo,
  schemaTransacciones,
  schemaComparativoGastos,
  schemaPropuestaAhorro,
  schemaConfirmarAccion,
  schemaTarjetaAccion,
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
  const [saldo, metas, tarjetas] = await Promise.all([
    getSaldoUsuario(userId),
    getMetasUsuario(userId),
    getTarjetasCredito(userId),
  ]);

  const tabla: Record<string, number> = { saldo };

  const tarjeta = tarjetas[0];
  if (tarjeta) {
    tabla['tarjeta.saldo'] = tarjeta.saldoActual;
    tabla['tarjeta.limite'] = tarjeta.limiteCredito;
    tabla['tarjeta.disponible'] = tarjeta.limiteCredito - tarjeta.saldoActual;
  }

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

    /* ---------------------------------------------------------------- *
     * Bloques de ACCIÓN. El usuario los acepta o rechaza y el cliente le
     * avisa al agente en el siguiente turno ("Acepto <etiqueta>."). Ver
     * client/components/chat/tipos.ts.
     * ---------------------------------------------------------------- */

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
  };
}
