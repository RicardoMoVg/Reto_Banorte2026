import type { ReactNode } from 'react';

/**
 * AIState: el historial "plano" (serializable) que se le manda de vuelta al
 * modelo en cada turno. Vive en el servidor.
 */
export type MensajeHistorial = {
  role: 'user' | 'assistant';
  content: string;
};
export type AIState = MensajeHistorial[];

/**
 * UIState: lo que efectivamente se renderiza en pantalla — incluye nodos de
 * React ya resueltos (los bloques A2UI), no solo texto. Vive en el cliente.
 */
export type MensajeUI = {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
};
export type UIState = MensajeUI[];
