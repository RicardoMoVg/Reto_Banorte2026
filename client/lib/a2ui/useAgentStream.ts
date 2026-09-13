import { useEffect, useRef, useState } from 'react';
import { fetch } from 'expo/fetch';
import type { Mensaje } from './types';

/**
 * Cuántos turnos del historial se mandan al agente.
 *
 * No es un número estético: cada request paga el historial completo en
 * tokens y el free tier de Gemini da muy pocas requests al día (ver
 * README). Sin tope, la quinta pregunta de una demo cuesta el triple que
 * la primera.
 */
const TURNOS_DE_CONTEXTO = 20;

/**
 * Aplana la conversación a lo que entiende el modelo.
 *
 * Clave: de un bloque se manda QUÉ se mostró, nunca sus `props`. Ahí viven
 * los montos, y metérselos al contexto es invitarlo a repetirlos en prosa
 * — justo lo que prohíbe constitution.md 4.2. Con el nombre del bloque y
 * la etiqueta que él mismo redactó le alcanza para entender un "Acepto
 * ..." del turno siguiente.
 */
function aHistorial(mensajes: Mensaje[]) {
  return mensajes.slice(-TURNOS_DE_CONTEXTO).map((m) => {
    if (m.tipo === 'texto') {
      return { rol: m.rol, contenido: m.contenido };
    }
    const referencia = m.props.etiqueta ?? m.props.titulo ?? '';
    return { rol: 'asistente' as const, contenido: `[Mostraste el bloque ${m.nombre}: ${referencia}]` };
  });
}

/** crypto.randomUUID() no existe en Hermes/Android nativo (sí en web) — id simple en su lugar. */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Encapsula el fetch streaming + parseo NDJSON contra `/api/agent` y el
 * estado de la conversación. Antes vivía inline en App.tsx (Paso 2-3); acá
 * es reusable y no sabe nada de qué componentes existen (eso es
 * catalog.ts/SurfaceRenderer.tsx).
 */
export function useAgentStream(apiUrl: string) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(false);

  /**
   * Espejo de `mensajes` para leerlo dentro de `enviar` sin depender de la
   * clausura del render. Con la clausura, dos mensajes seguidos mandan
   * historial viejo — el stale closure clásico, y solo se nota escribiendo
   * rápido.
   */
  const mensajesRef = useRef<Mensaje[]>([]);
  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  /**
   * `esDecision` marca el turno en que el usuario contesta una tarjeta de
   * accion. No es cosmetico: sin el, el modelo vuelve a proponer el mismo
   * bloque 2 de cada 3 veces, porque "Acepto el plan..." se parece
   * demasiado a "quiero un plan" y la descripcion de la tool le gana al
   * system prompt. Con el, el servidor apaga las tools ese turno y la
   * respuesta en texto deja de depender de que el modelo obedezca.
   */
  async function enviar(texto: string, { esDecision = false } = {}) {
    if (!texto || cargando) return;

    setCargando(true);
    setMensajes((prev) => [
      ...prev,
      { id: uid(), tipo: 'texto', rol: 'user', contenido: texto },
    ]);

    try {
      const resp = await fetch(`${apiUrl}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: texto,
          historial: aHistorial(mensajesRef.current),
          esDecision,
        }),
      });

      if (!resp.body) throw new Error('La respuesta no trae body (sin streaming).');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      /**
       * Id de la burbuja que está recibiendo texto ahora mismo. El modelo
       * manda el texto en fragmentos; sin esto, cada fragmento se volvía
       * una burbuja nueva y una frase salía partida en veinte.
       */
      let idTextoActual: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lineas = buffer.split('\n');
        buffer = lineas.pop() ?? '';

        for (const linea of lineas) {
          if (!linea.trim()) continue;
          const evento = JSON.parse(linea);

          if (evento.type === 'surface' && evento.tipo) {
            // Un bloque corta la corrida de texto: lo que venga después es
            // un párrafo nuevo, no la continuación del de antes.
            idTextoActual = null;
            setMensajes((prev) => [
              ...prev,
              {
                id: uid(),
                tipo: 'surface',
                rol: 'asistente',
                nombre: evento.tipo,
                props: evento.props,
              },
            ]);
          } else if (evento.type === 'text' && evento.content) {
            setMensajes((prev) => {
              if (idTextoActual) {
                return prev.map((m) =>
                  m.id === idTextoActual && m.tipo === 'texto'
                    ? { ...m, contenido: m.contenido + evento.content }
                    : m,
                );
              }
              const id = uid();
              idTextoActual = id;
              return [...prev, { id, tipo: 'texto', rol: 'asistente', contenido: evento.content }];
            });
          } else if (evento.type === 'error') {
            idTextoActual = null;
            setMensajes((prev) => [
              ...prev,
              {
                id: uid(),
                tipo: 'texto',
                rol: 'asistente',
                contenido: evento.message,
                esError: true,
              },
            ]);
          }
        }
      }
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: uid(),
          tipo: 'texto',
          rol: 'asistente',
          contenido: `Error de red: ${String(err)}`,
          esError: true,
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  /**
   * Borra la conversación en memoria. Hoy el historial solo vive aquí (se
   * pierde al recargar); cuando se agregue SQLite local — constitution.md
   * 3.1, el historial NUNCA sube al servidor — esta función es también el
   * lugar donde se borrará de disco.
   */
  function limpiar() {
    setMensajes([]);
  }

  return { mensajes, cargando, enviar, limpiar };
}
