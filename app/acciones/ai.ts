import { createAI } from 'ai/rsc';
import { generateUIFromAI } from './ai-to-ui-engine';
import type { AIState, UIState } from '@/lib/ai/rsc-types';

/**
 * Puente entre la Server Action y React: expone el AIState (historial plano
 * para el modelo) y el UIState (nodos de React ya renderizados) a
 * `useActions()`/`useUIState()` en el cliente. Se monta una vez en
 * app/layout.tsx envolviendo toda la app.
 */
export const AI = createAI({
  actions: { generateUIFromAI },
  // Los tipos van en los estados iniciales, NO como genéricos explícitos:
  // createAI<AIState, UIState, Actions> tiene un tercer genérico que por
  // defecto es {}. Si pasamos solo dos, Actions queda clavado en {} y
  // useActions() deja de ver generateUIFromAI.
  initialAIState: [] as AIState,
  initialUIState: [] as UIState,
});
