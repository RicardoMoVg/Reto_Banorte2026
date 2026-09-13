import { tool } from 'ai';
import { getMetasUsuario, getSaldoUsuario, getTransaccionesRecientes } from '@/lib/mcp/mcp-client';
import {
  schemaProgresoMeta,
  schemaSaldo,
  schemaTransacciones,
  schemaComparativoGastos,
  schemaPropuestaAhorro,
  schemaConfirmarAccion,
} from './a2ui-schemas';

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
      execute: async ({ metaId, mensajeAgente }) => {
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
          },
        };
      },
    }),

    mostrarSaldo: tool({
      description:
        'Muestra un monto financiero destacado: saldo disponible, total ' +
        'gastado en el mes, dinero ahorrado, etc.',
      parameters: schemaSaldo,
      execute: async ({ titulo, mensajeAgente }) => {
        const saldo = await getSaldoUsuario(userId);

        return {
          tipo: 'TarjetaSaldo' as const,
          props: {
            titulo,
            monto: saldo,
            mensajeAgente,
          },
        };
      },
    }),

    mostrarTransacciones: tool({
      description:
        'Muestra una lista de movimientos recientes del usuario. Úsala ' +
        'cuando pregunte en qué gastó, sus últimos cargos o sus ingresos.',
      parameters: schemaTransacciones,
      execute: async ({ titulo, limite, mensajeAgente }) => {
        const transacciones = await getTransaccionesRecientes(userId, limite ?? 10);

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
      execute: async ({ titulo, mensajeAgente }) => {
        // No existe una tool de MCP para "gasto por categoría" — se
        // agrega aquí en JS a partir de las transacciones, en vez de
        // agregar una tabla/query nueva en mcp-server/ (ver plan, Paso 3c).
        const transacciones = await getTransaccionesRecientes(userId, 100);

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
          props: { titulo, categorias, mensajeAgente },
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
