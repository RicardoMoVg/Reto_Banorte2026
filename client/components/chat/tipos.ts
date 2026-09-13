/**
 * Contrato de los bloques de ACCIÓN (`components/chat/`).
 *
 * ## En qué se diferencian de los bloques de `components/` (raíz)
 *
 * Los de la raíz son informativos: el agente los manda, se pintan, y ahí
 * termina el asunto. Estos proponen algo que el usuario acepta o rechaza, y
 * **su respuesta vuelve al agente** como contexto del siguiente turno — es
 * el ciclo que describe `constitution.md` sección 2 y que hasta ahora el
 * código no cerraba.
 *
 * Dos consecuencias de diseño:
 *
 * 1. **Viven en el chat, no en el tablero.** Una propuesta es un momento de
 *    una conversación ("¿acepto este plan?"), no un dato que tenga sentido
 *    fijar en Inicio. Por eso `app/(tabs)/index.tsx` filtra estos bloques
 *    fuera del tablero: ver `ES_BLOQUE_DE_ACCION`.
 * 2. **Necesitan un callback, y los callbacks no se pueden serializar.** El
 *    agente manda JSON por la red (`constitution.md` 4.1): no hay forma de
 *    que mande una función `onAceptar`. El handler llega por contexto de
 *    React (`lib/a2ui/AccionesProvider.tsx`), igual que resolvía el viejo
 *    `pin-context.tsx` del chat web retirado. El componente sigue sin hacer
 *    red ni saber nada de `server/`: solo llama a `responder()`.
 *
 * ## Lo que estos bloques NO hacen
 *
 * Aceptar **no mueve dinero ni guarda nada**. `mcp-server/` hoy solo expone
 * tools de lectura (`get_metas`, `get_transacciones`, `get_saldo`); no hay
 * una sola de escritura. La decisión queda en el estado de la sesión y se
 * le avisa al agente. Los componentes lo dicen en pantalla — prometer que
 * se configuró algo que no se guardó en ningún lado sería justo el tipo de
 * dato inventado que prohíbe `constitution.md` 4.2 y 6.
 */

import type { Intencion } from '../../lib/ui/theme';

/** Props que comparte todo bloque de acción, además de las suyas. */
export interface PropsDeAccion {
  /**
   * Qué está en juego en esta acción. La elige el modelo de un enum cerrado
   * y el cliente la traduce a color (`COLOR_INTENCION` en `lib/ui/theme.ts`).
   *
   * El modelo manda la intención, NUNCA un color: si mandara `'#EB0029'`,
   * el servidor estaría decidiendo diseño y cambiar la paleta obligaría a
   * tocar el prompt en vez de un archivo de tokens. Es la misma regla de
   * `constitution.md` 4.4 aplicada al estilo — por referencia, no por valor.
   */
  intencion?: Intencion;
  /**
   * Identificador único de ESTA propuesta, generado por la tool en
   * `server/`, nunca por el modelo. Es la llave con la que
   * `AccionesProvider` recuerda la decisión.
   */
  idAccion: string;
  /**
   * Etiqueta humana de la acción ("el plan de ahorro para tu fondo de
   * emergencia"). Es lo que se le manda al agente al responder, así que
   * debe leerse bien dentro de una frase y **no puede contener cifras**:
   * ver `constitution.md` 4.4 sobre por qué el modelo nunca retranscribe
   * un número.
   */
  etiqueta: string;
  mensajeAgente: string;
}

/**
 * Nombres (el `tipo` del protocolo) de los bloques de acción. El tablero de
 * Inicio los usa para excluirlos: son de conversación, no de layout.
 */
export const BLOQUES_DE_ACCION = [
  'PropuestaAhorro',
  'ConfirmarAccion',
  'ActionCardSelector',
] as const;

export function esBloqueDeAccion(nombre: string) {
  return (BLOQUES_DE_ACCION as readonly string[]).includes(nombre);
}
