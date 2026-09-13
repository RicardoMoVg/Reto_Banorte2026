import { crearTransferencia } from '@/lib/mcp/mcp-client';

/**
 * Operaciones que el CLIENTE puede disparar al confirmar una tarjeta de
 * acción, sin pasar por el modelo.
 *
 * ## Por qué existe
 *
 * Mover dinero no debe depender de que el modelo vuelva a elegir bien.
 * Antes, `crearTransferencia` era una tool normal: el usuario escribía
 * "mándale 300 a Juan" y el dinero se movía en ese mismo turno, sin
 * confirmar nada. Ahora el flujo es:
 *
 * 1. El modelo llama `proponerTransferencia` — valida el contacto y arma
 *    la tarjeta, pero NO escribe.
 * 2. La tarjeta viaja con una receta `{ tool, args }` ya resuelta.
 * 3. El usuario confirma, el cliente devuelve esa receta tal cual, y el
 *    servidor la ejecuta desde aquí.
 *
 * El paso 3 no llama al modelo. Eso importa por tres razones: el monto y
 * el contacto ya están fijados (el modelo no puede equivocarse en un
 * segundo intento), la respuesta es inmediata, y no gasta una request del
 * free tier.
 *
 * ## Por qué es una lista blanca y no un mapa abierto
 *
 * El cliente manda el nombre de la operación, así que sin acotarlo sería
 * "ejecuta lo que te pidan por HTTP". Aquí solo entran operaciones que un
 * usuario ya confirmó en pantalla, y el `userId` lo pone SIEMPRE el
 * servidor — nunca viene del cuerpo de la petición.
 */
export interface Ejecucion {
  tool: string;
  args: Record<string, unknown>;
}

/** Resultado en la forma que ya entiende el stream: bloque o error. */
type Salida = { tipo: string; props: Record<string, unknown> } | { error: string };

const EJECUTABLES: Record<string, (userId: string, args: any) => Promise<Salida>> = {
  async ejecutarTransferencia(userId, args: { contactoId: string; monto: number; concepto?: string }) {
    if (!args?.contactoId || typeof args.monto !== 'number' || args.monto <= 0) {
      return { error: 'La transferencia llegó sin contacto o con un monto inválido.' };
    }

    const resultado = await crearTransferencia(userId, args.contactoId, args.monto, args.concepto);
    if ('error' in resultado) return { error: resultado.error };

    return {
      tipo: 'Confirmacion',
      props: {
        titulo: 'Transferencia enviada',
        mensaje: `Se registró tu transferencia por $${args.monto}.`,
        exito: true,
        mensajeAgente: 'Queda en tu historial de movimientos.',
      },
    };
  },
};

export function esEjecutable(nombre: unknown): nombre is string {
  return typeof nombre === 'string' && nombre in EJECUTABLES;
}

export function ejecutar(userId: string, ejecucion: Ejecucion): Promise<Salida> {
  return EJECUTABLES[ejecucion.tool](userId, ejecucion.args ?? {});
}
