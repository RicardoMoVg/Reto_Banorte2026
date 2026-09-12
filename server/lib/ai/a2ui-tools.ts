import { tool } from 'ai';
import { getMetasUsuario, getSaldoUsuario, getTransaccionesRecientes } from '@/lib/mcp/mcp-client';
import {
  schemaProgresoMeta,
  schemaSaldo,
  schemaTransacciones,
  schemaComparativoGastos,
} from './a2ui-schemas';

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

    // Próximo bloque (Paso 3 del plan) -> nueva tool aquí, mismo patrón.
  };
}
