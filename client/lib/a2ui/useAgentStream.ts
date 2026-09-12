import { useState } from 'react';
import { fetch } from 'expo/fetch';
import type { Mensaje } from './types';

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

  async function enviar(texto: string) {
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
        body: JSON.stringify({ message: texto }),
      });

      if (!resp.body) throw new Error('La respuesta no trae body (sin streaming).');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
            setMensajes((prev) => [
              ...prev,
              { id: uid(), tipo: 'texto', rol: 'asistente', contenido: evento.content },
            ]);
          } else if (evento.type === 'error') {
            setMensajes((prev) => [
              ...prev,
              { id: uid(), tipo: 'texto', rol: 'asistente', contenido: `⚠️ ${evento.message}` },
            ]);
          }
        }
      }
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        { id: uid(), tipo: 'texto', rol: 'asistente', contenido: `⚠️ Error de red: ${String(err)}` },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return { mensajes, cargando, enviar };
}
