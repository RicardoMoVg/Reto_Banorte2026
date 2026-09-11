import { createAI } from '@ai-sdk/rsc';
import { enviarMensaje } from './agente';
import type { AIState, UIState } from '@/lib/ai/rsc-types';

/**
 * Puente entre la Server Action y React: expone el AIState (historial plano
 * para el modelo) y el UIState (nodos de React ya renderizados) a
 * `useActions()`/`useUIState()` en el cliente. Se monta una vez en
 * app/layout.tsx envolviendo toda la app.
 */
export const AI = createAI<AIState, UIState>({
  actions: { enviarMensaje },
  initialAIState: [],
  initialUIState: [],
});
