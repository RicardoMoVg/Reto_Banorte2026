/**
 * CATÁLOGO AI-TO-UI (capa 3 del protocolo)
 * ========================================
 *
 * Los "bloques de LEGO" que el modelo puede inyectar en pantalla. El agente
 * NO genera HTML ni CSS: solo elige cuál de estos componentes usar y con qué
 * props. Por eso son cerrados y no importan nada de `ai`, `ai/rsc` ni
 * `lib/mcp` — solo reciben props.
 *
 * Todo bloque que se exporte aquí debe:
 *   1. tener su tool en lib/ai/bloques.tsx (para que el modelo pueda elegirlo), y
 *   2. tener su `case` en components/dashboard/DashboardComponible.tsx
 *      (para poder rehidratarse cuando el usuario lo ancla al dashboard).
 */
export { RastreadorMetas } from './RastreadorMetas';
export { TarjetaSaldo } from './TarjetaSaldo';
export { ListaTransacciones } from './ListaTransacciones';
export { ComparativoGastos } from './ComparativoGastos';
export type { PropsBloque } from './tipos';
