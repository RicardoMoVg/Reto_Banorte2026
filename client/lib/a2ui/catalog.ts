import type { ComponentType } from 'react';
import { RastreadorMetas } from '../../components/RastreadorMetas';
import { TarjetaSaldo } from '../../components/TarjetaSaldo';
import { ListaTransacciones } from '../../components/ListaTransacciones';
import { ComparativoGastos } from '../../components/ComparativoGastos';
import { ActionCardSelector } from '../../components/chat/ActionCardSelector';
import { ConfirmarAccion } from '../../components/chat/ConfirmarAccion';
import { PropuestaAhorro } from '../../components/chat/PropuestaAhorro';

/**
 * Catálogo A2UI: mapea el `tipo` que manda el backend (ver
 * server/lib/ai/a2ui-tools.ts) al componente nativo que lo renderiza.
 *
 * Agregar un bloque nuevo = registrarlo aquí, una línea. Nada más cambia:
 * ni el parser del stream (useAgentStream.ts), ni el renderer
 * (SurfaceRenderer.tsx). Contrato de nombres en constitution.md 4.2/4.3 —
 * el string aquí debe ser IDÉNTICO al `tipo` que regresa la tool.
 */
export const catalogoA2ui: Record<string, ComponentType<any>> = {
  // Informativos (components/): el agente los manda y ahí termina.
  RastreadorMetas,
  TarjetaSaldo,
  ListaTransacciones,
  ComparativoGastos,

  // De acción (components/chat/): el usuario acepta o rechaza, y su
  // respuesta vuelve al agente. Contrato en components/chat/tipos.ts.
  PropuestaAhorro,
  ConfirmarAccion,
  ActionCardSelector,
};
