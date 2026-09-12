/**
 * Tipos del protocolo A2UI-lite (mismo contrato que
 * server/app/api/agent/route.ts — ver constitution.md sección 4.1).
 */
export type EventoTexto = { type: 'text'; content: string };
export type EventoSurface = { type: 'surface'; tipo: string; props: Record<string, unknown> };
export type EventoDone = { type: 'done' };
export type EventoError = { type: 'error'; message: string };

export type EventoA2ui = EventoTexto | EventoSurface | EventoDone | EventoError;

/**
 * Estado de un mensaje en el chat. A propósito `nombre`/`props` son
 * genéricos (`string`/`Record<string, unknown>`), no una unión de literales
 * como en el Paso 3 — así agregar un bloque nuevo al catálogo (`catalog.ts`)
 * nunca requiere tocar este archivo.
 */
export type Mensaje =
  | { id: string; tipo: 'texto'; rol: 'user' | 'asistente'; contenido: string }
  | { id: string; tipo: 'surface'; rol: 'asistente'; nombre: string; props: Record<string, unknown> };
