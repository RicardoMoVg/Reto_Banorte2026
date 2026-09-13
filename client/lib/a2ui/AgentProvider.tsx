import { createContext, useContext, type ReactNode } from 'react';
import { useAgentStream } from './useAgentStream';

/**
 * Puerto del backend. `server/` corre en 3000 (ver .env.example y
 * scripts/dev.js, que sincroniza esta variable automáticamente).
 *
 * Recordatorio del gotcha documentado en AGENTS.md: `expo start` lee el
 * .env UNA sola vez al arrancar. Si cambias EXPO_PUBLIC_API_URL hay que
 * matar Expo y volver a levantarlo, o la app le seguirá pegando a la URL
 * vieja en silencio. La ventana de Perfil muestra el valor efectivo justo
 * para poder detectar eso de un vistazo.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type ContextoAgente = ReturnType<typeof useAgentStream> & { apiUrl: string };

const AgentContext = createContext<ContextoAgente | null>(null);

/**
 * Monta un único `useAgentStream` en la raíz del árbol (app/_layout.tsx).
 *
 * Por qué no vive dentro de la ventana de chat: con navegación por tabs, la
 * pantalla se puede desmontar al cambiar de pestaña y la conversación se
 * perdería. Además Inicio necesita poder mandar una pregunta y luego
 * navegar al chat — solo funciona si ambas ventanas comparten el mismo
 * estado.
 */
export function AgentProvider({ children }: { children: ReactNode }) {
  const stream = useAgentStream(API_URL);

  return (
    <AgentContext.Provider value={{ ...stream, apiUrl: API_URL }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent(): ContextoAgente {
  const contexto = useContext(AgentContext);
  if (!contexto) {
    throw new Error('useAgent() se usó fuera de <AgentProvider> (ver app/_layout.tsx).');
  }
  return contexto;
}
