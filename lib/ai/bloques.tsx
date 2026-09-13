import { z } from 'zod';
import {
  ComparativoGastos,
  ListaTransacciones,
  RastreadorMetas,
  TarjetaSaldo,
} from '@/components/ai-to-ui';
import type { HistorialMutable } from './rsc-types';

/**
 * Catálogo de tools A2UI: cada tool devuelve un bloque de React YA
 * RENDERIZADO, no JSON para que el cliente lo interprete.
 *
 * Para agregar un bloque nuevo:
 *   1. Crear el componente en components/ai-to-ui/ (con su <BotonPin />).
 *   2. Exportarlo en components/ai-to-ui/index.ts.
 *   3. Agregar su schema + tool aquí.
 *   4. Agregar su `case` en components/dashboard/DashboardComponible.tsx.
 */

/**
 * Los schemas viven aparte de las tools para poder derivar los tipos con
 * z.infer. La inferencia de streamUI (schema -> params de `generate`) no
 * llega hasta acá porque las tools se construyen en esta función y no
 * inline en la llamada a streamUI.
 */
const schemaProgresoMeta = z.object({
  titulo: z.string().describe('Título de la meta, ej. "Fondo de emergencia".'),
  porcentaje: z
    .number()
    .min(0)
    .max(100)
    .describe('Porcentaje de avance, de 0 a 100.'),
  mensajeAgente: z
    .string()
    .describe('Mensaje breve (una línea) y motivador sobre este avance.'),
});

const schemaSaldo = z.object({
  titulo: z.string().describe('Qué representa el monto, ej. "Saldo disponible".'),
  monto: z
    .number()
    .describe('Monto en pesos mexicanos. Negativo si es una deuda.'),
  mensajeAgente: z.string().describe('Contexto breve, una línea.'),
});

const schemaTransacciones = z.object({
  titulo: z
    .string()
    .describe('Encabezado de la lista, ej. "Últimos movimientos".'),
  transacciones: z
    .array(
      z.object({
        descripcion: z.string().describe('Comercio o concepto.'),
        monto: z
          .number()
          .describe('Negativo si es gasto, positivo si es ingreso.'),
        categoria: z
          .string()
          .optional()
          .describe('Categoría, ej. "comida", "suscripciones".'),
      }),
    )
    .max(8)
    .describe('Entre 3 y 8 movimientos.'),
  mensajeAgente: z.string().describe('Observación breve, una línea.'),
});

const schemaComparativoGastos = z.object({
  titulo: z.string().describe('Encabezado, ej. "Tus gastos de septiembre".'),
  categorias: z
    .array(
      z.object({
        nombre: z.string().describe('Nombre de la categoría.'),
        monto: z.number().describe('Total gastado en la categoría.'),
      }),
    )
    .max(6)
    .describe('Entre 3 y 6 categorías, de mayor a menor.'),
  mensajeAgente: z
    .string()
    .describe('Insight breve sobre el patrón de gasto, una línea.'),
});

/** Placeholder mientras se resuelve el tool call. */
function Esqueleto() {
  return (
    <div className="h-24 w-full max-w-md animate-pulse rounded-xl bg-neutral-100" />
  );
}

export function construirBloques(history: HistorialMutable) {
  /** Cierra el turno dejando constancia en el historial del modelo. */
  const registrar = (resumen: string) =>
    history.done([...history.get(), { role: 'assistant', content: resumen }]);

  return {
    mostrarProgresoMeta: {
      description:
        'Muestra visualmente el progreso de una meta de ahorro o hábito ' +
        'financiero del usuario. Úsala siempre que pregunte por su avance, ' +
        'en vez de describir el porcentaje en texto.',
      parameters: schemaProgresoMeta,
      generate: async function* ({
        titulo,
        porcentaje,
        mensajeAgente,
      }: z.infer<typeof schemaProgresoMeta>) {
        yield <Esqueleto />;

        // TODO(MCP): reemplazar `titulo`/`porcentaje` generados por el modelo
        // con el dato real: lib/mcp/mcp-client.ts -> getMetasUsuario(userId).
        // El modelo solo debería controlar `mensajeAgente`.

        registrar(`Mostré el progreso de "${titulo}": ${porcentaje}%.`);
        return (
          <RastreadorMetas
            titulo={titulo}
            porcentaje={porcentaje}
            mensajeAgente={mensajeAgente}
          />
        );
      },
    },

    mostrarSaldo: {
      description:
        'Muestra un monto financiero destacado: saldo disponible, total ' +
        'gastado en el mes, dinero ahorrado, etc.',
      parameters: schemaSaldo,
      generate: async function* ({
        titulo,
        monto,
        mensajeAgente,
      }: z.infer<typeof schemaSaldo>) {
        yield <Esqueleto />;

        // TODO(MCP): getSaldoUsuario(userId) en vez del monto generado.

        registrar(`Mostré ${titulo}: ${monto} MXN.`);
        return (
          <TarjetaSaldo
            titulo={titulo}
            monto={monto}
            mensajeAgente={mensajeAgente}
          />
        );
      },
    },

    mostrarTransacciones: {
      description:
        'Muestra una lista de movimientos recientes del usuario. Úsala ' +
        'cuando pregunte en qué gastó, sus últimos cargos o sus ingresos.',
      parameters: schemaTransacciones,
      generate: async function* ({
        titulo,
        transacciones,
        mensajeAgente,
      }: z.infer<typeof schemaTransacciones>) {
        yield <Esqueleto />;

        // TODO(MCP): getTransaccionesRecientes(userId, limite).

        registrar(`Mostré ${transacciones.length} movimientos ("${titulo}").`);
        return (
          <ListaTransacciones
            titulo={titulo}
            transacciones={transacciones}
            mensajeAgente={mensajeAgente}
          />
        );
      },
    },

    mostrarComparativoGastos: {
      description:
        'Muestra una gráfica de barras comparando cuánto gastó el usuario ' +
        'por categoría. Úsala cuando pregunte en qué se le va el dinero o ' +
        'pida comparar categorías.',
      parameters: schemaComparativoGastos,
      generate: async function* ({
        titulo,
        categorias,
        mensajeAgente,
      }: z.infer<typeof schemaComparativoGastos>) {
        yield <Esqueleto />;

        // TODO(MCP): agregación por categoría desde el servidor MCP.

        registrar(`Mostré el comparativo de gastos ("${titulo}").`);
        return (
          <ComparativoGastos
            titulo={titulo}
            categorias={categorias}
            mensajeAgente={mensajeAgente}
          />
        );
      },
    },
  };
}
