import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useChatPanel } from '../ui/ChatPanelProvider';
import { useAgent } from './AgentProvider';

export type EstadoAccion = 'pendiente' | 'aceptada' | 'rechazada';

interface ContextoAcciones {
  estadoDe: (idAccion: string) => EstadoAccion;
  responder: (
    idAccion: string,
    decision: Exclude<EstadoAccion, 'pendiente'>,
    etiqueta: string,
    /**
     * Receta `{tool, args}` que el servidor ejecuta al confirmar, sin
     * pasar por el modelo. La trae la propia tarjeta en sus props; el
     * cliente solo la devuelve tal cual. Solo aplica al aceptar: rechazar
     * nunca ejecuta nada.
     */
    ejecucion?: unknown,
  ) => void;
  /**
   * Manda una petición al agente y abre el chat para que se vea la
   * respuesta. Es lo que hace un botón de acceso rápido
   * (`components/AccesoRapido.tsx`) al tocarse.
   */
  lanzar: (peticion: string) => void;
}

const AccionesContext = createContext<ContextoAcciones | null>(null);

/**
 * Puente entre los bloques de acción (`components/chat/`) y el agente.
 *
 * **Por qué un contexto y no una prop:** los bloques nacen de un JSON que
 * llegó por la red (`constitution.md` 4.1) y una función no se puede
 * serializar — el servidor no tiene manera de mandar un `onAceptar`. El
 * componente se monta en el cliente, así que sí puede leer un contexto que
 * vive más arriba en el árbol. Es el mismo truco que usaba el
 * `pin-context.tsx` del chat web que se retiró.
 *
 * **Qué hace al responder:** guarda la decisión en memoria (para que la
 * tarjeta quede resuelta en el historial) y le manda un mensaje al agente.
 * Ese mensaje se ve en el chat como cualquier otro del usuario: la decisión
 * queda registrada a la vista, no en un canal oculto.
 *
 * **Qué NO hace (todavía):** no guarda nada en el servidor. `mcp-server/`
 * YA tiene tools de escritura (crearMeta, aportarAMeta, crearTransferencia,
 * etc. -- ver `server/lib/ai/a2ui-tools.ts`) y `server/` ya expone los
 * mismos endpoints como REST tradicional (`POST /api/metas/aportar`,
 * `POST /api/transferencias`, etc. -- `constitution.md` 3.3), pero nadie
 * conectó "aceptar" a ninguno de los dos todavía. El cambio sigue siendo
 * aquí: este `responder` debe llamar al endpoint REST correspondiente
 * antes de avisarle al agente. Falta también exponer el id real (ej.
 * `metaId`) en las props de `PropuestaAhorro`/`ConfirmarAccion` -- hoy solo
 * traen el nombre para mostrar y el id embebido dentro de `idAccion`, que
 * no es un contrato pensado para parsearse.
 *
 * Debe montarse DENTRO de `<AgentProvider>` — usa su `enviar`.
 */
export function AccionesProvider({ children }: { children: ReactNode }) {
  const { enviar } = useAgent();
  const { abrir } = useChatPanel();
  const [estados, setEstados] = useState<Record<string, EstadoAccion>>({});

  const responder = useCallback<ContextoAcciones['responder']>(
    (idAccion, decision, etiqueta, ejecucion) => {
      setEstados((previo) => {
        // Sin esto, un doble toque manda dos mensajes al agente.
        if (previo[idAccion] && previo[idAccion] !== 'pendiente') return previo;
        return { ...previo, [idAccion]: decision };
      });

      // Solo texto que el modelo ya había redactado (`etiqueta`), nunca una
      // cifra: el modelo no debe retranscribir montos (constitution.md 4.4).
      enviar(decision === 'aceptada' ? `Acepto ${etiqueta}.` : `No acepto ${etiqueta}.`, {
        esDecision: true,
        // Rechazar nunca ejecuta: la receta solo viaja si acepto.
        ejecucion: decision === 'aceptada' ? ejecucion : undefined,
      });
    },
    [enviar],
  );

  /**
   * Un acceso rápido NO ejecuta la operación al tocarse: manda la petición
   * como si el usuario la hubiera escrito y abre la conversación, donde el
   * agente propone y el usuario confirma en la tarjeta de siempre.
   *
   * Podría dispararse la receta `{tool, args}` directo (es lo que hace
   * `responder` al aceptar) y sería un toque menos, pero entonces un botón
   * en el tablero movería dinero sin confirmación, a un toque de
   * distancia de un bolsillo. Un atajo ahorra el tecleo, no el "sí".
   */
  const lanzar = useCallback(
    (peticion: string) => {
      enviar(peticion);
      abrir();
    },
    [enviar, abrir],
  );

  const valor = useMemo<ContextoAcciones>(
    () => ({
      estadoDe: (idAccion: string) => estados[idAccion] ?? 'pendiente',
      responder,
      lanzar,
    }),
    [estados, responder, lanzar],
  );

  return <AccionesContext.Provider value={valor}>{children}</AccionesContext.Provider>;
}

/**
 * Devuelve el estado de una acción y cómo responderla.
 *
 * Fuera del provider regresa `null` en vez de reventar: así un bloque de
 * acción renderizado en un contexto que no acepta decisiones (por ejemplo
 * una vista previa) se pinta en modo solo lectura en lugar de tirar la
 * pantalla.
 */
export function useAcciones(): ContextoAcciones | null {
  return useContext(AccionesContext);
}
